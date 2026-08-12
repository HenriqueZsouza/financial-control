import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialCategories = [
  { name: 'Mercado', slug: 'mercado', icon: '🛒' },
  { name: 'Farmácia', slug: 'farmacia', icon: '💊' },
  { name: 'Vestuário', slug: 'vestuario', icon: '👕' },
  { name: 'Estudos', slug: 'estudos', icon: '📚' },
  { name: 'Moradia', slug: 'moradia', icon: '🏠' },
  { name: 'Transporte', slug: 'transporte', icon: '🚌' },
  { name: 'Lazer', slug: 'lazer', icon: '🎮' },
  { name: 'Saúde', slug: 'saude', icon: '🏥' },
  { name: 'Educação', slug: 'educacao', icon: '🎓' },
  { name: 'Outros', slug: 'outros', icon: '📦' },
];

async function main() {
  console.log('🌱 Iniciando seed de categorias...');

  for (const category of initialCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    console.log(`  ✓ ${category.name} (${category.slug})`);
  }

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });