import { useMemo } from 'react';
import { ApplicationError } from "@m-cafe-app/utils";
import { useUiSettings } from "./useUiSettings";
import { CSSProperties } from "react";
import { isCSSPropertyKey } from "@m-cafe-app/shared-constants";
import { useAppSelector } from "./reduxHooks";
import { CommonProps, LCSpecificValue } from '../../types';

interface UseInitLCProps extends CommonProps {
  componentType:
    'input' |
    'container' |
    'button' |
    'button-group' |
    'modal' |
    'svg-image' |
    'svg-button' |
    'switch' |
    'dropbox' |
    'table' |
    'image' |
    'scrollbar' |
    'layout',
  componentName: string,
  errorMessage?: string,
  placeholder?: string,
  label?: string,
  variant?: string
}



export const useInitLC = ({
  componentType,
  componentName,
  classNameAddon,
  classNameOverride,
  errorMessage,
  placeholder,
  label,
  variant
}: UseInitLCProps) => {

  const theme = useAppSelector(store => store.settings.theme);
  const uiSettingsHash = useAppSelector(store => store.settings.uiSettingsHash);

  const { ui } = useUiSettings();

  // uiSettingsClassnames are written by componentName instead of component type for complex (unbasic) layout components
  const uiSettingsClassnames = componentType === 'layout'
    ? ui(`${componentName}-${theme}-classNames`)
    : ui(`${componentType}-${theme}-classNames`);

  // baseVariant must have the most SCSS for web / inlineCSS for mobile
  const baseVariant = ui(`${componentType}-${theme}-baseVariant`);

  const baseVariantClassName = baseVariant.length > 0
    ? baseVariant[0].value
    : '';

  const uiSettingsInlineCSS = ui(`${componentType}-${theme}-inlineCSS`);

  const specialUiSettingsSet = new Set([ ...ui(`${componentType}-${theme}-special`).map(uiSetting => uiSetting.name) ]);

  return useMemo(() => {
    
    /**
     * ClassName resolve block
     */
    let settingsClassNameAddon = '';

    // add all settings that are true
    for (const uiSetting of uiSettingsClassnames) {
      settingsClassNameAddon += uiSetting.value + ' ';
    }

    settingsClassNameAddon.trim();

    const classNameBase = classNameOverride
      ? classNameOverride
      : componentName;


    let className = classNameBase;

    if (variant) className = className + `-${variant}`;
    if (baseVariantClassName) className = className + ' ' + baseVariantClassName;
    if (classNameAddon) className = className + ' ' + classNameAddon;
    if (settingsClassNameAddon) className = className + ' ' + settingsClassNameAddon;
    if (errorMessage) className = className + ' ' + 'error';

    /**
     * InlineCSS resolve block
     */
    const style = {} as CSSProperties;

    for (const uiSetting of uiSettingsInlineCSS) {
      if (uiSetting.value !== 'false') {
        const key = uiSetting.name;
        if (!isCSSPropertyKey(key)) throw new ApplicationError('Wrong key applied to inline CSS', { current: uiSetting, all: uiSettingsInlineCSS });
        style[key] = uiSetting.value;
      }
    }

    /**
     * Component type-specific resolve block
     */
    let specific = undefined as LCSpecificValue;

    switch (componentType) {

      case 'input':
        const userAgent = navigator.userAgent;
        const regex = /Firefox\/(\d+(\.\d+)?)/;
        const match = userAgent.match(regex);
        const firefoxVersion = match ? Number(match[1]) : null;
        const firefoxFix = firefoxVersion
          ? firefoxVersion > 108
          : false;

        specific = {
          labelAsPlaceholder: specialUiSettingsSet.has('labelAsPlaceholder'),
          useBarBelow: specialUiSettingsSet.has('useBarBelow'),
          firefoxFix
        };
        break;

      default:
        break;
    }

    return {
      /**
       * Resolved className as sum of:
       * 
       * classNameOverride(props?) | componentName +
       * -${variant}(example: buttons) + baseVariantClassName +
       * classNameAddon(props?) + settingsClassNameAddon
       */
      className,
      style,
      /**
       * Component type-specific value
       */
      specific,
      /**
       * Base variant class name
       */
      baseVariant: baseVariantClassName
    };
  }, [
    theme,
    componentType,
    componentName,
    classNameAddon,
    classNameOverride,
    errorMessage,
    placeholder,
    label,
    variant,
    uiSettingsHash
  ]);
};