import type { CommonFieldProps } from '@m-market-app/frontend-logic/types';
import type { FieldHookConfig } from 'formik';
import { useField } from 'formik';
import { Image } from '../Image';
import { Tooltip } from '../Tooltip';
import { apiBaseUrl } from '@m-market-app/shared-constants';
import { Input } from '../Input';

type FormikDateFieldProps = FieldHookConfig<string> & CommonFieldProps & {
  spellCheck?: 'true' | 'false';
};

export const FormikDateField = ({ 
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
  ...props
}: FormikDateFieldProps) => {
  
  const [field, meta] = useField(props);

  const errorMessage = meta.error && meta.touched
    ? meta.error
    : '';

  return(
    <Input
      classNameOverride={classNameOverride}
      classNameAddon={classNameAddon}
      errorMessage={errorMessage}
      type='date'
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
      step={1}
    >
      <Image src={`${apiBaseUrl}/public/pictures/svg/calendar.svg`} classNameAddon='svg'/>
      <>
        {tooltip &&
          <Tooltip text={tooltip}/>
        }
      </>
    </Input>
  );
};