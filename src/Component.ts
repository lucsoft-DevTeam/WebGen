import { createElement } from "./Components.ts";
import { Refable, asRef } from "./State.ts";
import { FontWeight, TextSize } from "./types.ts";
export abstract class Component extends EventTarget {
    constructor(protected wrapper: HTMLElement = createElement("div")) {
        super();
    }

    addClass<stringy extends string>(val: Refable<stringy>, ...classes: string[]) {
        asRef(val).listen((val, oldVal) => {
            if (oldVal)
                this.wrapper.classList.remove(oldVal);
            this.wrapper.classList.add(val);
        });

        this.wrapper.classList.add(...classes);
        return this;
    }
    setAttribute(key: string, value: Refable<string | undefined> = "") {
        asRef(value).listen((val) => {
            if(val === undefined) {
                this.wrapper.removeAttribute(key);
                return;
            }
            this.wrapper.setAttribute(key, val);
        });
        return this;
    }
    setPadding(size: string) {
        this.wrapper.style.padding = size;
        return this;
    }
    addPrefix(component: Component) {
        this.wrapper.prepend(component.draw());
        return this;
    }
    addSuffix(component: Component) {
        this.wrapper.append(component.draw());
        return this;
    }
    setWidth(size: string) {
        this.wrapper.style.width = size;
        return this;
    }
    setHeight(size: string) {
        this.wrapper.style.height = size;
        return this;
    }
    setMargin(size: string) {
        this.wrapper.style.margin = size;
        return this;
    }
    setId(id: string) {
        this.wrapper.id = id;
        return this;
    }
    setGrow(value = 1) {
        this.wrapper.style.flexGrow = value.toString();
        return this;
    }
    setAlign(type: "center" | "end" | "start" | "stretch") {
        this.wrapper.style.alignItems = type;
        return this;
    }
    setJustify(type: "center" | "end" | "start" | "stretch") {
        this.wrapper.style.justifyItems = type;
        return this;
    }
    setBorderRadius(value: "none" | "tiny" | "mid" | "large" | "complete") {
        const map = {
            "tiny": "0.3rem",
            "mid": "0.5rem",
            "large": "0.8rem",
            "complete": "100rem"
        };

        //@ts-ignore fail if bad input
        this.wrapper.style.borderRadius = map[ value ] ?? value;

        return this;
    }
    setTextSize(size: TextSize) {
        this.addClass(`text-${size}`);
        return this;
    }
    setFontWeight(weight: FontWeight) {
        this.addClass(`font-${weight}`);
        return this;
    }
    setDirection(type: "column" | "row" | "row-reverse" | "column-reverse") {
        this.wrapper.style.flexDirection = type;
        return this;
    }
    draw() {
        return this.wrapper;
    }
    onRightClick(func: (env: MouseEvent) => void) {
        this.wrapper.addEventListener('contextmenu', (e) => func(e));
        return this;
    }
    onClick(func: (ev: MouseEvent) => void) {
        this.wrapper.addEventListener('click', func);
        return this;
    }
    removeFromLayout() {
        this.wrapper.style.display = "contents";
        return this;
    }
}
