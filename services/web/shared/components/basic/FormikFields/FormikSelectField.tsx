import type { CommonFieldProps } from '@m-market-app/frontend-logic/types';
import type { FieldHookConfig } from 'formik';
import type { MouseEvent } from 'react';
import { useField } from 'formik';
import { Tooltip } from '../Tooltip';
import { SelectInput } from '../SelectInput';


type FormikSelectFieldProps = FieldHookConfig<string> & CommonFieldProps & {
  options: string[],
  tNode?: string,
  spellCheck?: 'true' | 'false'
};

export const FormikSelectField = ({
  disabled = false,
  classNameOverride,
  classNameAddon,
  placeholder,
  label,
  style,
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  tooltip,
  tNode,
  options,
  ...props
}: FormikSelectFieldProps) => {

  const [field, meta, helpers] = useField(props);

  const errorMessage = meta.error && meta.touched
    ? meta.error
    : '';

  const handleChooseOption = (e: MouseEvent<HTMLDivElement>) => {
    void helpers.setValue(e.currentTarget.innerText, false);
  };

  return(
    <SelectInput
      classNameOverride={classNameOverride}
      classNameAddon={classNameAddon}
      errorMessage={errorMessage}
      type='text'
      internalType='select'
      id={field.name}
      name={field.name}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      disabled={disabled}
      style={style}
      autoComplete={autoComplete}
      autoCorrect={autoCorrect}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      placeholder={placeholder}
      label={label}
      options={options}
      tNode={tNode}
      handleChooseOption={handleChooseOption}
    >
      <>
        {tooltip &&
          <Tooltip text={tooltip}/>
        }
      </>
    </SelectInput>
  );
};