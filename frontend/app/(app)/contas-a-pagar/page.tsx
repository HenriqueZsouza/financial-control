'use client';

import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { ComingSoon } from '../../../components/ComingSoon';

export default function BillsPage() {
  return (
    <ComingSoon
      title="Contas a pagar"
      description="Organize vencimentos e lembretes futuramente."
      icon={<ScheduleOutlinedIcon />}
      body="O gerenciamento de contas a pagar ainda não faz parte desta versão."
    />
  );
}
