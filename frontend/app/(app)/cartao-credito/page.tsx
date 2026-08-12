import { CardIcon } from '../../../components/icons';

export default function CreditCardPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Em breve</span>
          <h1>Cartão de crédito</h1>
          <p>Em breve, acompanhe suas faturas em um só lugar.</p>
        </div>
      </div>
      <div className="placeholder">
        <span className="illustration">
          <CardIcon />
        </span>
        <h2>Em construção</h2>
        <p>O controle de cartão de crédito está planejado para uma próxima versão.</p>
      </div>
    </>
  );
}
