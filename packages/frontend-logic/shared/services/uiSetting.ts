import axios from 'axios';
import { apiBaseUrl } from '@m-market-app/shared-constants';


const getUiSettings = async () => {

  const { data: fixedUiSettings } = await axios.get<JSON>(
    `${apiBaseUrl}/ui-setting`
  );

  return fixedUiSettings;
};

export default { getUiSettings };