'use client';

import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Empty } from '../../../components/Empty';
import { PageHeader } from '../../../components/PageHeader';
import { services } from '../../../lib/api';
import { formatDateTime } from '../../../lib/dates';
import { queryKeys } from '../../../lib/query-keys';

export default function NotificationsPage() {
  const client = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.notifications, queryFn: services.notifications });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.notifications });
  const read = useMutation({ mutationFn: services.readNotification, onSuccess: refresh });
  const all = useMutation({ mutationFn: services.readAllNotifications, onSuccess: refresh });
  const notifications = data?.notifications.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Atualizações"
        title="Notificações"
        description="Acompanhe respostas de convites e mudanças no seu grupo familiar."
        action={
          <Button onClick={() => all.mutate()} disabled={!data?.notifications.unreadCount}>
            Marcar todas como lidas
          </Button>
        }
      />
      {notifications.length === 0 ? (
        <Paper>
          <Empty />
        </Paper>
      ) : (
        <Stack spacing={1.25}>
          {notifications.map((item) => (
            <Paper
              key={item.id}
              sx={{ p: 2, border: '1px solid', borderColor: item.readAt ? 'divider' : 'text.primary' }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                  <Typography fontWeight={item.readAt ? 500 : 700}>{item.title}</Typography>
                  <Typography color="text.secondary">{item.body}</Typography>
                  <Typography variant="caption">{formatDateTime(item.createdAt)}</Typography>
                </Stack>
                {item.readAt ? (
                  <Chip size="small" label="Lida" />
                ) : (
                  <Button size="small" onClick={() => read.mutate(item.id)}>
                    Marcar como lida
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </>
  );
}
