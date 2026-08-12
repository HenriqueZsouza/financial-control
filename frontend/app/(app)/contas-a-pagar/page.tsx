import { ClockIcon } from '../../../components/icons';

export default function BillsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Em breve</span>
          <h1>Contas a pagar</h1>
          <p>Organize vencimentos e lembretes futuramente.</p>
        </div>
      </div>
      <div className="placeholder">
        <span className="illustration">
          <ClockIcon />
        </span>
        <h2>Em construção</h2>
        <p>O gerenciamento de contas a pagar ainda não faz parte desta versão.</p>
      </div>
    </>
  );
}
