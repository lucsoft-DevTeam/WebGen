import { Component } from "../Component.ts";
import { createElement } from "../Components.ts";
import { isPointer, Pointable } from "../State.ts";

export const Label = (title: Pointable<string>, type: `h${1 | 2 | 3 | 4 | 5 | 6}` | `span` = "span") => new class extends Component {
    wrapper = createElement(type);
    constructor() {
        super();
        if (isPointer(title))
            title.listen((val) => this.wrapper.textContent = val);
        else
            this.wrapper.textContent = title;
    }

    setAlign(type: "center" | "end" | "start") {
        this.wrapper.style.textAlign = type;
        return this;
    }
};