import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  ['Mercado', 'mercado'], ['Farmácia', 'farmacia'], ['Vestuário', 'vestuario'],
  ['Estudos', 'estudos'], ['Moradia', 'moradia'], ['Transporte', 'transporte'],
  ['Lazer', 'lazer'], ['Saúde', 'saude'], ['Educação', 'educacao'], ['Outros', 'outros'],
  ['Investimentos', 'investimentos'],
] as const;

async function main() {
  await Promise.all(categories.map(([name, slug]) => prisma.category.upsert({
    where: { slug }, update: { name }, create: { name, slug },
  })));
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
