import { useLayoutEffect } from "react";

/** Puts the direction's theme class on <body> (so portaled menus inherit it) and sets the tab title. */
export function useBodyTheme(className: string, title?: string) {
  useLayoutEffect(() => {
    document.body.classList.add(className);
    const previous = document.title;
    if (title) document.title = title;
    return () => {
      document.body.classList.remove(className);
      document.title = previous;
    };
  }, [className, title]);
}
