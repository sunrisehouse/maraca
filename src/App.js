import './App.css';
import { useRoutes } from 'react-router-dom';
import { AppBar, Toolbar, Typography } from '@mui/material';
import SensorsIcon from '@mui/icons-material/Sensors';
import Main from './Main';
import Acquisition from './Acquisition';
import WaveformVisualizer from './WaveformVisualizer';

function App() {
  const routes = useRoutes([
    {
      path: "/",
      element: <Main />,
    },
    {
      path: "/acquisition",
      element: <Acquisition />
    },
    {
      path: "/WaveformVisualizer",
      element: <WaveformVisualizer />
    }
  ]);

  return (
    <div>
      <AppBar position="static" color="primary">
        <Toolbar>
          <SensorsIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="#app-bar-with-responsive-menu"
            sx={{
              mr: 2,
              display: { md: 'flex' },
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            SnV Data Acquisition
          </Typography>
        </Toolbar>
      </AppBar>
      {routes}
    </div>
  );
}

export default App;
