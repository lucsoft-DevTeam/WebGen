import { accessibilityButton, accessibilityDisableTabOnDisabled } from "../Accessibility.ts";
import { Color } from "../Color.ts";
import { Pointable, Pointer, asRef } from "../State.ts";
import { MIcon } from "../icons/MaterialIcons.ts";
import { ButtonStyle, ColoredComponent } from "../types.ts";
import { Box } from "./Box.ts";
import { Custom } from "./Custom.ts";
import "./Switch.css";
import { loadingWheel } from "./light-components/loadingWheel.ts";

class SwitchComponent extends ColoredComponent {
    loading = asRef(false);
    selected: Pointer<boolean>;
    constructor(selected: Pointer<boolean>, icon = MIcon("check")) {
        super();
        this.selected = selected;
        this.wrapper.tabIndex = accessibilityDisableTabOnDisabled();
        this.addClass(selected.map(it => it ? "selected" : "unselected"), "wswitch", Color.Grayscaled);
        this.addClass(this.loading.map(it => it ? 'loading' : 'non-loading'));
        this.wrapper.onkeydown = accessibilityButton(this.wrapper);
        this.wrapper.append(Box(
            icon.addClass("check-icon"),
            Box(Custom(loadingWheel() as Element as HTMLElement)).addClass("load-element", "loading")
        )
            .draw()
        );
    }
    onClick(action: (me: MouseEvent, pointer: Pointer<boolean>) => void) {
        this.wrapper.addEventListener('click', (me) => {
            if (this.color.getValue() == Color.Disabled) return;
            action(me, this.selected);
        });
        return this;
    }

    onPromiseClick(action: (me: MouseEvent, pointer: Pointer<boolean>) => Promise<void>) {
        this.onClick((me, p) => {
            if (this.loading.getValue()) return;
            this.loading.setValue(true);
            action(me, p)
                .finally(() => {
                    this.loading.setValue(false);
                });
        });
        return this;
    }

    setStyle(_style: Pointable<ButtonStyle>): this {
        throw new Error("Method not implemented.");
    }
}

export const Switch = (selected: Pointer<boolean>) => new SwitchComponent(selected);
