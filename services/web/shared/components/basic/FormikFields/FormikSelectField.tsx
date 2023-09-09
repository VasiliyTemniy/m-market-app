import { MouseEvent } from "react";
import { FieldHookConfig, useField } from "formik";
import type { CommonFieldProps } from '@m-cafe-app/frontend-logic/types';
import { useInitLC, useTranslation } from '@m-cafe-app/frontend-logic/shared/hooks';
import {
  autoCompleteTranslatedArray,
  autoCompleteArray
} from '@m-cafe-app/frontend-logic/utils';
import { Container } from "../Container";
import { Image } from "../Image";
import { Tooltip } from "../Tooltip";
import { apiBaseUrl } from "@m-cafe-app/shared-constants";

type FormikSelectFieldProps = FieldHookConfig<string> & CommonFieldProps & {
  options: string[],
  tNode?: string,
};


export const FormikSelectField = ({ disabled = false, ...props }: FormikSelectFieldProps) => {
  
  const { t } = useTranslation();

  const [field, meta, helpers] = useField(props);

  const errorMessage = meta.error && meta.touched
    ? meta.error
    : '';

  const { className, style, specific, baseVariant } = useInitLC({
    componentType: 'input',
    componentName: 'input-select',
    classNameAddon: props.classNameAddon,
    classNameOverride: props.classNameOverride,
    errorMessage,
    placeholder: props.placeholder,
    label: props.label,
  });

  const inputPlaceholder = specific?.labelAsPlaceholder
    ? undefined
    : props.placeholder;

  const labelText = specific?.labelAsPlaceholder
    ? errorMessage
      ? errorMessage
      : props.placeholder
    : props.label;

  const handleChooseOption = (e: MouseEvent<HTMLDivElement>) => {
    void helpers.setValue(e.currentTarget.innerText, false);
  };

  const translatedOptions = props.tNode
    ? props.options.map(option => t(`${props.tNode}.${option}`))
    : undefined;

  const displayedOptions = props.tNode && translatedOptions
    ? autoCompleteTranslatedArray(translatedOptions, field.value, t, props.tNode)
    : autoCompleteArray(props.options, field.value);

  return(
    <Container classNameAddon={`input-wrapper select ${baseVariant}`}>
      <input
        type='text'
        id={field.name}
        name={field.name}
        className={className}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={disabled}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck='false'
        style={style}
        placeholder={inputPlaceholder}
      />
      <label htmlFor={field.name}>{labelText}</label>
      <Image src={`${apiBaseUrl}/public/pictures/svg/notificationdown.svg`} classNameAddon='svg'/>
      <>
        {specific?.useBarBelow &&
          <div className='bar'/>
        }
      </>
      <Container classNameAddon='dropdown-wrapper'>
        <Container classNameAddon='options-wrapper'>
          {displayedOptions.map(option => 
            <Container key={option} onMouseDown={handleChooseOption} id={option} text={option}/>)
          }
        </Container>
        <>
          {displayedOptions.length > 0 && specific?.useBarBelow &&
            <div className='bar-after'/>
          }
          {props.tooltip &&
            <Tooltip text={props.tooltip}/>
          }
        </>
      </Container>
    </Container>
  );
};