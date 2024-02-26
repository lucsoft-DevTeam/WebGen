import { sortBy } from "https://deno.land/std@0.217.0/collections/sort_by.ts";
import { zod } from "../zod.ts";
import { NavigationRegistry } from "./Navigation.ts";
import { Refable, Reference, StateHandler, asRef, asState, listenOnInitalStateKeys } from "./State.ts";
import { lazyInit } from "./lazyInit.ts";

type Split<S extends string, D extends string> =
    string extends S ? string[] :
    S extends '' ? [] :
    S extends `${infer T}${D}${infer U}` ? [ T, ...Split<U, D> ] : [ S ];

type Prettify<T> = {
    [ K in keyof T ]: T[ K ];
} & unknown;

type TrimLeadingSlash<T extends string> = T extends `/${infer U}` ? U : T;

type TrimTrailingSlash<T extends string> = T extends `${infer U}/` ? U : T;

type RouteOptions<Path extends string, T extends zod.ZodRawShape> = {
    path: Path;
    search?: T;
    inAccessible?: Refable<boolean>;
    events?: {
        onLazyInit?: () => void | Promise<void>;
        onActive?: () => void | Promise<void>;
        onInactive?: () => void;
    };
};

type RouteEntry = {
    pattern: URLPattern;
    patternUrl: string;
    inAccessible?: Reference<boolean>;
    intercept: (result: URLPatternResult) => Promise<void>;
};

// Filter out string that start with a colon
type FilterNamedParam<T extends string> = T extends `:${infer NamedParam}` ? NamedParam : never;

type ListOfParamsToOnlyNamedParams<T extends string[]> = {
    [ K in keyof T ]: FilterNamedParam<T[ K ]>;
}[ number ];

export type UrlPath = `/${string}`;

export type Route<Path extends UrlPath, Search extends zod.ZodRawShape, BaseSearch extends zod.ZodRawShape, Base extends string = ""> = {
    active: Reference<boolean>,
    groups: StateHandler<Prettify<Record<ListOfParamsToOnlyNamedParams<Split<TrimLeadingSlash<`${Base}${TrimTrailingSlash<Path>}`>, "/">>, string>>>,
    search: StateHandler<zod.infer<zod.ZodObject<BaseSearch & Search>>>,
    navigate: (groups: Prettify<Record<ListOfParamsToOnlyNamedParams<Split<TrimLeadingSlash<`${Base}${TrimTrailingSlash<Path>}`>, "/">>, string>>, options?: NavigationNavigateOptions) => NavigationResult,
    createRoute: <NewBase extends UrlPath, NewSearch extends zod.ZodRawShape>(options: RouteOptions<NewBase, NewSearch>) => Route<NewBase, NewSearch, Search, TrimTrailingSlash<Path>>,
};

export type AnyRoute = Route<UrlPath, zod.ZodRawShape, zod.ZodRawShape, UrlPath>;

// deno-lint-ignore ban-types
type EmptyObject = {};

export const RouteRegistry = asRef<RouteEntry[]>([]);
export const activeRouteUrl = asRef<string>(location.href);
export const getRouteList = () => sortBy(RouteRegistry.getValue(), it => it.pattern.pathname).reverse();
export const getBestRouteFromUrl = (url: string | URL) => getRouteList().filter(x => x.inAccessible?.getValue() !== false).find(route => route.pattern.test(url));
export const activeRoute = activeRouteUrl.map(url => getBestRouteFromUrl(url));

NavigationRegistry.addItem({
    weight: 0,
    intercept: (url, event) => {
        const route = getBestRouteFromUrl(url);
        if (route) {
            event.intercept({
                handler: () => route.intercept(route.pattern.exec(url)!).finally(() => {
                    activeRouteUrl.setValue(url.toString());
                })
            });
        }
    }
});

export function createRoute<Path extends UrlPath, Search extends zod.ZodRawShape = EmptyObject, BaseSearch extends zod.ZodRawShape = EmptyObject, BasePath extends string = "">(options: RouteOptions<Path, Search>): Route<Path, Search, BaseSearch, BasePath> {
    const cleanedUpPath = options.path.replace(/\/$/, "");
    const pattern = new URLPattern(cleanedUpPath, location.origin);
    console.debug("Add Route:", cleanedUpPath);

    const groups = asState(
        Object.fromEntries(pattern.pathname
            .replace(/^\//, "")
            .split("/")
            .filter(x => x.startsWith(":"))
            .map(x => x.replace(/^:/, ""))
            .map(x => [ x, "" ] as const))
    ) as StateHandler<Record<string, string>>;

    const search = asState(Object.fromEntries(
        Object.entries(options.search ?? {})
            .map(([ key ]) => [ key, undefined ] as const)
    ) as Partial<Search>);

    const lazyInitActive = lazyInit(options.events?.onLazyInit ?? (() => { }));
    const active = asRef(false);
    const routeEntry = <RouteEntry>{
        pattern,
        patternUrl: cleanedUpPath,
        inAccessible: options.inAccessible,
        intercept: async (patternResult) => {
            for (const [ key, value ] of Object.entries(patternResult.pathname.groups)) {
                if (value === undefined) return;
                groups[ key as keyof typeof groups ] = value;
            }
            const searchParams = new URLSearchParams(patternResult.search.input);
            for (const key of Object.keys(options.search ?? {})) {
                const parsing = options.search?.[ key as keyof typeof options.search ]?.safeParse(searchParams.get(key));
                if (parsing?.success)
                    search[ key as keyof typeof search ] = parsing.data;
                else {
                    console.debug("Failed to parse", key, parsing?.error);
                    return;
                };
            }
            await lazyInitActive();
            await options.events?.onActive?.();
            active.setValue(true);
        }
    };


    RouteRegistry.addItem(routeEntry);

    activeRoute
        .map(route => route === routeEntry)
        .listen((isActive, wasActive) => {
            if (!isActive && wasActive) {
                active.setValue(false);
                options.events?.onInactive?.();
            }
        });

    listenOnInitalStateKeys(search).listen(change => {
        if (!active.getValue())
            return;
        const url = new URL(location.href);

        Object.entries(change)
            .forEach(([ key, value ]) => {
                url.searchParams.set(key, value.toString());
            });

        if (new URL(location.href).toString() !== url.toString())
            navigation.navigate(url.toString());
    });

    listenOnInitalStateKeys(groups).listen(change => {
        if (!active.getValue())
            return;

        const filledRoute = new URL(createURLFromGroups(cleanedUpPath, change), location.origin);

        Object.entries(search)
            .forEach(([ key, value ]) => {
                if (value != undefined)
                    filledRoute.searchParams.set(key, `${value}`);
            });

        if (new URL(location.href).toString() !== filledRoute.toString())
            navigation.navigate(filledRoute.toString());
    });

    return {
        active,
        groups: groups as unknown,
        search,
        navigate: (groups, options) => {
            const filledRoute = createURLFromGroups(cleanedUpPath, groups);
            return navigation.navigate(filledRoute, options);
        },
        createRoute: (newOptions) =>
            createRoute({
                ...newOptions,
                path: cleanedUpPath + newOptions.path.replace(/\/$/, "") as Path,
            }),
    } as Route<Path, Search, BaseSearch, BasePath>;
}


function createURLFromGroups(cleanedUpPath: string, groups: EmptyObject) {
    return cleanedUpPath.split("/").map(x => x.startsWith(":") ? groups[ x.replace(/^:/, "") as keyof typeof groups ] : x).join("/");
}

export function StartRouting() {
    const url = location.href;
    const route = getBestRouteFromUrl(url);
    activeRoute.setValue(route);
    if (!route) return;
    route?.intercept(route.pattern.exec(url)!);
}