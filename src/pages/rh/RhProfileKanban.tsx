import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Rota legada /rh/vagas/:id/kanban
 * Hoje o kanban vive dentro de /rh/vagas/:id?view=kanban.
 * Este componente apenas redireciona.
 */
export default function RhProfileKanban() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/rh/vagas/${id}?view=kanban`, { replace: true });
    } else {
      navigate('/rh/vagas', { replace: true });
    }
  }, [id, navigate]);

  return null;
}
