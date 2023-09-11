import { useInitLC } from "@m-cafe-app/frontend-logic/shared/hooks";
import { CommonProps } from "@m-cafe-app/frontend-logic/types";
import type { MouseEventHandler, Ref, MouseEvent, CSSProperties } from "react";

export interface ContainerProps extends CommonProps {
  style?: CSSProperties
  children?: JSX.Element[] | JSX.Element;
  onClick?: MouseEventHandler;
  onMouseEnter?: MouseEventHandler;
  onMouseMove?: MouseEventHandler;
  onMouseDown?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onMouseUp?: MouseEventHandler;
  ref?: Ref<HTMLDivElement>;
  text?: string;
}

export const Container = ({
  classNameOverride,
  classNameAddon,
  id,
  children,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseDown,
  onMouseLeave,
  onMouseUp,
  ref,
  text,
  style
}: ContainerProps) => {

  const { className, style: settingsStyle } = useInitLC({
    componentType: 'container',
    componentName: 'container',
    classNameAddon,
    classNameOverride,
  });

  const handleMouseOver = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (onClick) onClick(e);
  };

  return (
    <div
      ref={ref}
      className={className}
      id={id}
      style={{ ...style, ...settingsStyle }}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseOver={handleMouseOver}
      onMouseUp={onMouseUp}
    >
      {text}
      {children}
    </div>
  );
};