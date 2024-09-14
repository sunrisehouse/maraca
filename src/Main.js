import './Main.css';
import { Button, Container, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Main() {
  const navigate = useNavigate();
  const [tWaiting, setTWating] = useState(1);
  const [tInterval, setTInterval] = useState(1);
  const [tMaxRun, setTMaxRun] = useState(1);

  const handleStartButton = () => {
    navigate(`/acquisition?tWaiting=${tWaiting * 1000}&tInterval=${tInterval * 1000}&tMaxRun=${tMaxRun * 1000 * 60}`);
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
            value={tWaiting}
            onChange={(event) => {
              setTWating(event.target.value);
            }}
          />
          <TextField
            label="Tinterval (seconds)"
            variant="filled"
            type="number"
            size="small"
            defaultValue={3}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">sec</InputAdornment>,
            }}
            value={tInterval}
            onChange={(event) => {
              setTInterval(event.target.value);
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
            value={tMaxRun}
            onChange={(event) => {
              setTMaxRun(event.target.value);
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
      <Container sx={{ position: "fixed", bottom: 0, right: 0 }}>
        <Button
          onClick={() => {navigate('/wave-form-visualizer')}}
        >
          test1
        </Button>
        <Button
          onClick={() => {navigate('/bar-graph-visualizer')}}
        >
          test2
        </Button>
        v4
      </Container>
    </Container>
  );
}

export default Main;
