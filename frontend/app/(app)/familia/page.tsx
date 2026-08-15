'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PageHeader } from '../../../components/PageHeader';
import { ApiError, services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useFeedback } from '../../../lib/feedback';
import { queryKeys } from '../../../lib/query-keys';

export default function FamilyPage() {
  const { user } = useAuth();
  const feedback = useFeedback();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState<'leave' | 'dissolve' | null>(null);
  const { data } = useQuery({ queryKey: queryKeys.family, queryFn: services.family });
  const { data: invites } = useQuery({ queryKey: queryKeys.familyInvites, queryFn: services.receivedInvites });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.family });
    queryClient.invalidateQueries({ queryKey: queryKeys.familyInvites });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  };

  const invite = useMutation({
    mutationFn: services.inviteFamily,
    onSuccess: () => {
      setEmail('');
      refresh();
      feedback.notify('Convite enviado.');
    },
    onError: (error) =>
      feedback.notify(error instanceof ApiError ? error.message : 'Não foi possível enviar o convite.', 'error'),
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: number; accept: boolean }) => {
      if (accept) await services.acceptInvite(id);
      else await services.declineInvite(id);
    },
    onSuccess: (_, variables) => {
      refresh();
      feedback.notify(variables.accept ? 'Convite aceito.' : 'Convite recusado.');
    },
    onError: (error) =>
      feedback.notify(error instanceof ApiError ? error.message : 'Não foi possível responder ao convite.', 'error'),
  });

  const remove = useMutation({
    mutationFn: services.removeFamilyMember,
    onSuccess: () => {
      refresh();
      feedback.notify('Membro removido.');
    },
  });

  const action = useMutation({
    mutationFn: async (kind: 'leave' | 'dissolve') => {
      if (kind === 'leave') await services.leaveFamily();
      else await services.dissolveFamily();
    },
    onSuccess: () => {
      setConfirm(null);
      refresh();
      feedback.notify('Grupo atualizado.');
    },
    onError: (error) =>
      feedback.notify(error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.', 'error'),
  });

  const group = data?.group;
  const owner = group?.members.find((member) => member.role === 'OWNER');
  const isOwner = owner?.userId === user?.id;

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email) invite.mutate(email);
  }

  return (
    <>
      <PageHeader
        eyebrow="Círculo"
        title="Família"
        description="Convide pessoas e acompanhe quem participa da sua visão financeira familiar."
      />

      {(invites?.invites.length ?? 0) > 0 ? (
        <Stack spacing={1.5} sx={{ mb: 2.25 }}>
          {invites!.invites.map((item) => (
            <Alert
              key={item.id}
              severity="info"
              action={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => respond.mutate({ id: item.id, accept: true })}>
                    Aceitar
                  </Button>
                  <Button size="small" color="inherit" onClick={() => respond.mutate({ id: item.id, accept: false })}>
                    Recusar
                  </Button>
                </Stack>
              }
            >
              Você recebeu um convite para participar de um grupo familiar.
            </Alert>
          ))}
        </Stack>
      ) : null}

      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.25 }}>
        <Typography variant="h6">{group ? group.name : 'Crie seu grupo familiar'}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          Convide um usuário já cadastrado. O grupo é criado no primeiro convite.
        </Typography>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          onSubmit={handleInviteSubmit}
        >
          <TextField
            label="E-mail do familiar"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={invite.isPending}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
            {invite.isPending ? 'Enviando…' : 'Enviar convite'}
          </Button>
        </Stack>
      </Paper>

      {group ? (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Membro</TableCell>
                <TableCell>Papel</TableCell>
                {isOwner ? <TableCell align="right">Ação</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {group.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    {member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={member.role === 'OWNER' ? 'Owner' : 'Membro'} />
                  </TableCell>
                  {isOwner ? (
                    <TableCell align="right">
                      {member.role === 'MEMBER' ? (
                        <Button color="error" size="small" onClick={() => remove.mutate(member.userId)}>
                          Remover
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
            {isOwner ? (
              <Button color="error" onClick={() => setConfirm('dissolve')}>
                Dissolver grupo
              </Button>
            ) : (
              <Button color="error" onClick={() => setConfirm('leave')}>
                Sair do grupo
              </Button>
            )}
          </Stack>
        </Paper>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'dissolve' ? 'Dissolver grupo?' : 'Sair do grupo?'}
        description={
          confirm === 'dissolve'
            ? 'Os membros deixarão de compartilhar a visão familiar.'
            : 'Você deixará de aparecer na visão familiar.'
        }
        confirmLabel={confirm === 'dissolve' ? 'Dissolver' : 'Sair'}
        loading={action.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && action.mutate(confirm)}
      />
    </>
  );
}
