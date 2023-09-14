import { useAppSelector, useInitAppAdmin } from '@m-cafe-app/frontend-logic/admin/hooks';
import { AppRoutes } from './AppRoutes';
import { LoginPage, Loading, Scrollable, Container, Header } from 'shared/components';
import { collapseExpanded } from '@m-cafe-app/frontend-logic/utils';
import { StaffSidebar } from 'shared/staffComponents';


export const App = () => {

  useInitAppAdmin();

  const uiSettingsHash = useAppSelector(state => state.settings.uiSettingsHash);
  const fixedLocsHash = useAppSelector(state => state.fixedLocs.locsHash);
  const user = useAppSelector(state => state.user);

  if (!uiSettingsHash || !fixedLocsHash)
    return <Loading size='medium'/>;

  if (!user.phonenumber) {
    return (
      <>
        {/* <Notification/> */}
        <Container id='app-wrapper' onClick={() => collapseExpanded()}>
          <Header />
          <Scrollable wrapperClassNameAddon='app-content-wrapper' id='app-content' highlightScrollbarOnContentHover={false}>
            {/* <ColorTestPage/> */}
            <LoginPage
              modalActive={true}
              onCancel={() => null}
            />
          </Scrollable>
        </Container>
        {/* <Footer /> */}
      </>
    );
  } else {
    return (
      <>
        {/* <Header /> */}
        {/* <Menu /> */}
        <Container id='app-wrapper' onClick={() => collapseExpanded()}>
          <Header />
          <Scrollable wrapperClassNameAddon='app-content-wrapper' id='app-content' highlightScrollbarOnContentHover={false}>
            {/* <Notification/> */}
            <AppRoutes/>
          </Scrollable>
          <StaffSidebar/>
        </Container>
        {/* <Footer /> */}
      </>
    );
  }
};