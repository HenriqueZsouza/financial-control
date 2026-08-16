'use client';

import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import { ComingSoon } from '../../../components/ComingSoon';

export default function CreditCardPage() {
  return (
    <ComingSoon
      title="Cartão de crédito"
      description="Em breve, acompanhe suas faturas em um só lugar."
      icon={<CreditCardOutlinedIcon />}
      body="O controle de cartão de crédito está planejado para uma próxima versão."
    />
  );
}
