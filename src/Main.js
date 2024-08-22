import './Main.css';
import { Button, Container, InputAdornment, Paper, TextField, Toolbar, Typography } from '@mui/material';
import { redirect, useNavigate } from 'react-router-dom';

function Main() {
  const navigate = useNavigate();

  const handleStartButton = () => {
    navigate("/acquisition");
  };

  return (
    <Container maxWidth="sm">
      <Paper
        sx={{
          marginTop: '40px',
          padding: '20px 0 40px',
          '& .MuiTextField-root': { marginTop: '10px' },
        }}
      >
        <Container>

          {/* <SettingsIcon /> */}
          <Typography
            variant="h5"
            noWrap
            sx={{
              mr: 2,
              display: { md: 'flex' },
              fontWeight: 700,
            }}
          >
            Parameters
          </Typography>
          <TextField
            label="Twaiting"
            variant="filled"
            type="number"
            size="small"
            defaultValue={1}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">sec</InputAdornment>,
            }}
          />
          <TextField
            label="Tinterval"
            variant="filled"
            type="number"
            size="small"
            defaultValue={1}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">sec</InputAdornment>,
            }}
          />
          <TextField
            label="Tmaxrun"
            variant="filled"
            type="number"
            size="small"
            defaultValue={1}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">min</InputAdornment>,
            }}
          />
        </Container>
      </Paper>
      <Container
        sx={{
          marginTop: '40px',
        }}
      >
        <Button variant="contained"
          onClick={handleStartButton}
        >
          Start
        </Button>
      </Container>
    </Container>
  );
}

export default Main;
