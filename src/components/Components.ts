export const createElement: <K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions) => HTMLElementTagNameMap[ K ]
    = <K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions) => window.document.createElement(tagName, options);

export const img = (source: string | undefined, ...classList: string[]) => {
    const img = createElement('img') as HTMLImageElement
    img.classList.add(...classList)
    if (source) img.src = source;
    return img;
};
export function custom(type: keyof HTMLElementTagNameMap, message: undefined | string | HTMLElement, ...classList: string[]): HTMLElement {
    const span = createElement(type);
    span.classList.add(...classList)

    if (typeof message == "string")
        span.innerText = message;
    else if (message != undefined)
        span.append(message);
    return span;
}