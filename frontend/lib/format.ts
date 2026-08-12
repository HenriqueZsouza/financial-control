import dayjs from 'dayjs';
export const money = (cents: number, visible = true) => visible ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100) : '••••••';
export const dateLabel = (date: string) => dayjs(date).format('DD/MM/YYYY');
export const currentPeriod = () => { const now = dayjs(); return { month: now.month() + 1, year: now.year() }; };
export const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
