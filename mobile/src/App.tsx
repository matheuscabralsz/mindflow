import { useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProfilePage } from './pages/settings/ProfilePage';
import { EntryListPage } from './pages/entries/EntryListPage';
import { EntryEditorPage } from './pages/entries/EntryEditorPage';
import { EntryDetailPage } from './pages/entries/EntryDetailPage';
import SearchPage from './pages/search/SearchPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme */
import './theme';

setupIonicReact();

const App: React.FC = () => {
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth state on app startup
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public Routes */}
          <Route exact path="/login">
            <LoginPage />
          </Route>
          <Route exact path="/signup">
            <SignupPage />
          </Route>
          <Route exact path="/forgot-password">
            <ForgotPasswordPage />
          </Route>

          {/* Protected Routes */}
          <Route exact path="/home">
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          </Route>
          <Route exact path="/profile">
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </Route>

          {/* Entry Routes */}
          <Route exact path="/entries">
            <ProtectedRoute>
              <EntryListPage />
            </ProtectedRoute>
          </Route>
          <Route exact path="/entries/new">
            <ProtectedRoute>
              <EntryEditorPage />
            </ProtectedRoute>
          </Route>
          <Route exact path="/entries/edit/:id">
            <ProtectedRoute>
              <EntryEditorPage />
            </ProtectedRoute>
          </Route>
          <Route exact path="/entries/view/:id">
            <ProtectedRoute>
              <EntryDetailPage />
            </ProtectedRoute>
          </Route>
          <Route exact path="/search">
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          </Route>

          {/* Default Redirect */}
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
