import React, { useState, useEffect } from 'react';
import { State } from '../types/state';
import { getStates } from '../services/api';
import { Box, Typography, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const StateCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: theme.shadows[4],
  },
}));

const StateLineage: React.FC = () => {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await getStates();
        setStates(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load states');
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  const getGeneration = (state: State): number => {
    if (!state.parentId) return 0;
    const parent = states.find(s => s.id === state.parentId);
    return parent ? getGeneration(parent) + 1 : 0;
  };

  const groupStatesByGeneration = (): State[][] => {
    const generations: State[][] = [];
    states.forEach(state => {
      const gen = getGeneration(state);
      if (!generations[gen]) generations[gen] = [];
      generations[gen].push(state);
    });
    return generations;
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const generations = groupStatesByGeneration();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        State Lineage
      </Typography>
      <Grid container spacing={2}>
        {generations.map((genStates, genIndex) => (
          <Grid item xs={12} key={genIndex}>
            <Typography variant="h6" gutterBottom>
              Generation {genIndex + 1}
            </Typography>
            <Grid container spacing={2}>
              {genStates.map((state) => (
                <Grid item xs={12} sm={6} md={4} key={state.id}>
                  <StateCard>
                    <Typography variant="h6" gutterBottom>
                      Status {state.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ID: {state.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Parent ID: {state.parentId || 'None'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Passage: {state.passage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Date: {new Date(state.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Notes: {state.notes || 'None'}
                    </Typography>
                  </StateCard>
                </Grid>
              ))}
            </Grid>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StateLineage; 