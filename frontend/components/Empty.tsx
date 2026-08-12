export function Empty({ children = 'Nenhum dado encontrado para este período.' }: { children?: React.ReactNode }) { return <div className="empty">{children}</div>; }
