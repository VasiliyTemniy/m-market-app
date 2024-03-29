import { useEffect } from 'react';
import { useFormikContext } from 'formik';
import { useDebounce } from '../hooks/useDebounce';

// Rewritten from formik-persist class component to function component
// https://github.com/jaredpalmer/formik-persist/tree/master

interface FormikPersistProps {
  formName: string;
  isSessionStorage?: boolean;
  debounceTimer?: number;
}

export const FormikPersist = ({
  formName,
  isSessionStorage = true,
  debounceTimer = 300
}: FormikPersistProps) => {

  const { values, setValues, dirty } = useFormikContext();
  const debouncedValues = useDebounce(values, debounceTimer);

  useEffect(() => {
    const storedState = isSessionStorage
      ? window.sessionStorage.getItem(`marketApp:${formName}`)
      : window.localStorage.getItem(`marketApp:${formName}`);
    if (storedState && storedState !== null) {
      void setValues(JSON.parse(storedState), true);
    }
  }, []);

  useEffect(() => {
    if (isSessionStorage && dirty) {
      window.sessionStorage.setItem(`marketApp:${formName}`, JSON.stringify(debouncedValues));
    } else {
      window.localStorage.setItem(`marketApp:${formName}`, JSON.stringify(debouncedValues));
    }
  }, [debouncedValues]);

  return null;
};