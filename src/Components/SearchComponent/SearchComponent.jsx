import React, { useState } from 'react';
import { TextField, Button, Grid, Typography, Box } from '@mui/material';
import { db } from "../../Components/Firebase/Firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from "../../Context/AuthContext";

const SearchComponent = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Iniciando búsqueda...");

      const q = query(
        collection(db, 'equipos'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);

      console.log("Documentos encontrados: ", querySnapshot.size);

      if (querySnapshot.empty) {
        setResults([]);
        setError('No se encontraron equipos.');
      } else {
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Items: ", items);
        setResults(items);
      }
    } catch (error) {
      console.error('Error fetching documents: ', error);
      setError('Error al buscar equipos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'equipos', id));
      setResults(results.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting document: ', error);
      setError('Error al eliminar el equipo.');
    }
  };

  return (
    <Box sx={{ padding: 2, textAlign: 'center' }}>
      <Box sx={{ marginBottom: 1 }}>
        <Typography variant="h5" sx={{ color: '#8B3A3A', fontWeight: 'bold' }}>
          Bienvenida {user.email}, Busca el Equipo por nombre pero recuerda con MAYUSCULA:
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Buscar por nombre en mayuscula"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              mb: 2,
              backgroundColor: '#1E90FF',
              '&:hover': {
                backgroundColor: '#4682B4',
              },
            }}
            fullWidth
          >
            Buscar
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Grid>
        {loading ? (
          <Typography>Buscando...</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {results.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                  {/* Imágenes en fila */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mb: 2 }}>
                    {item.url.map((imageUrl, index) => (
                      <Box key={index} sx={{ textAlign: 'center' }}>
                        <img 
                          src={imageUrl} 
                          alt={`${item.name} ${index}`} 
                          style={{ width: '100%', maxWidth: '200px', height: 'auto', marginBottom: '4px' }} 
                        />
                        <Typography variant="caption" sx={{ color: '#00008B' }}>
                          Imagen {index + 1}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box 
                    sx={{ 
                      border: '1px solid #00008B', 
                      padding: '8px', 
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      whiteSpace: 'normal',
                      width: '100%', 
                      mb: 2
                    }}
                  >
                    {item.name}
                  </Box>
                  <Box 
                    sx={{ 
                      border: '1px solid #00008B', 
                      padding: '8px', 
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      whiteSpace: 'normal',
                      marginBottom: '8px',
                      width: '100%' 
                    }}
                  >
                    {item.description}
                  </Box>
                </Box>
              ))}
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {results.map((item) => (
                <Button
                  key={item.id}
                  variant="outlined"
                  color="error"
                  onClick={() => handleDelete(item.id)}
                  sx={{ mb: 2 }}
                >
                  Eliminar {item.name}
                </Button>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SearchComponent;








