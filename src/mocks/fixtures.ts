import type { ArtworkId, CategoryId, EditionId, NetworkId, NftDetail } from '@/api/contracts'
import { createRandom, hexDigest } from './random'

export const COUPONS: Record<string, { basisPoints: number; label: string; expired: boolean }> = {
  KURIO10: { basisPoints: 1000, label: 'Desconto KURIO10', expired: false },
  WELCOME5: { basisPoints: 500, label: 'Desconto WELCOME5', expired: false },
  VELHO20: { basisPoints: 2000, label: 'Desconto VELHO20', expired: true },
}

export const NETWORK_FEE_ETH = '0.016'

const EDITION_SUPPLY: Record<EditionId, { label: string; supply: number }> = {
  e1: { label: '1/1', supply: 1 },
  e10: { label: '1/10', supply: 10 },
  e50: { label: '1/50', supply: 50 },
  open: { label: 'ABERTA', supply: 250 },
}

interface Seed {
  name: string
  tokenId: number
  image: ArtworkId
  price: string
  compare?: string
  category: CategoryId
  network: NetworkId
  badge?: string
}

const headlineSeeds: Seed[] = [
  { name: 'Emerald Ape', tokenId: 42, image: 'ape-varsity', price: '1.19', category: 'digital-art', network: 'ethereum' },
  { name: 'Sage Nomad', tokenId: 9, image: 'ape-hoodie', price: '1.69', category: 'digital-art', network: 'ethereum' },
  { name: 'Neon Vessel', tokenId: 552, image: 'ape-blazer', price: '1.99', compare: '2.29', category: 'generative', network: 'polygon', badge: 'RARO' },
  { name: 'Cosmic Bloom', tokenId: 118, image: 'ape-hoodie', price: '1.29', category: 'digital-art', network: 'ethereum' },
  { name: 'Violet Nomad', tokenId: 314, image: 'ape-hoodie', price: '1.39', category: '3d-art', network: 'solana' },
  { name: 'Ivory Baron', tokenId: 88, image: 'ape-blazer', price: '1.79', category: 'collectibles', network: 'ethereum' },
  { name: 'Golden Beat', tokenId: 207, image: 'ape-headphones', price: '0.99', category: 'music', network: 'polygon' },
  { name: 'Golden Signal', tokenId: 160, image: 'ape-headphones', price: '0.39', category: 'music', network: 'solana' },
  { name: 'Obsidian Muse', tokenId: 301, image: 'ape-blazer', price: '2.49', category: 'photography', network: 'ethereum' },
]

const adjectives = ['Amber', 'Cobalt', 'Crimson', 'Onyx', 'Velvet', 'Lunar', 'Solar', 'Jade', 'Ember', 'Slate', 'Coral', 'Indigo']
const nouns = ['Oracle', 'Mirage', 'Echo', 'Drifter', 'Sentinel', 'Harbor', 'Pilot', 'Relic', 'Atlas', 'Cipher']
const images: ArtworkId[] = ['ape-varsity', 'ape-hoodie', 'ape-blazer', 'ape-headphones']
const categories: CategoryId[] = ['digital-art', 'photography', 'music', '3d-art', 'collectibles', 'generative', 'games', 'subscriptions', 'utility']
const networks: NetworkId[] = ['ethereum', 'polygon', 'solana']
const prices = ['0.02', '0.45', '0.69', '0.85', '1.05', '1.49', '2.10', '2.75', '3.40', '4.20', '5.95', '7.80', '9.50', '12.30']

/**
 * Generates the deterministic catalog used by every scenario.
 */
export function buildCatalog(): NftDetail[] {
  const random = createRandom(20260729)
  const seeds: Seed[] = [...headlineSeeds]
  let index = 0
  while (seeds.length < 36) {
    const adjective = adjectives[index % adjectives.length]
    const noun = nouns[Math.floor(random() * nouns.length)]
    seeds.push({
      name: `${adjective} ${noun}`,
      tokenId: 100 + Math.floor(random() * 880),
      image: images[(index + 1) % images.length],
      price: prices[index % prices.length],
      category: categories[(index + 2) % categories.length],
      network: networks[index % networks.length],
    })
    index++
  }
  return seeds.map((seed, position) => {
    const id = `nft-${String(position + 1).padStart(3, '0')}`
    const gallery: ArtworkId[] = [seed.image, seed.image, seed.image, seed.image]
    const editionIds: EditionId[] = ['e1', 'e10', 'e50', 'open']
    const createdAt = new Date(Date.UTC(2026, 6, 29, 12) - position * 3600000).toISOString()
    return {
      id,
      tokenId: seed.tokenId,
      name: `${seed.name} #${String(seed.tokenId).padStart(3, '0')}`,
      collection: 'Kurio Apes',
      category: seed.category,
      network: seed.network,
      priceEth: seed.price,
      compareAtPriceEth: seed.compare ?? null,
      image: seed.image,
      badge: seed.badge ?? null,
      isNew: position % 4 === 0,
      trendingScore: ((position * 37) % 100) + (position % 3 === 0 ? 100 : 0),
      createdAt,
      version: 1,
      description:
        'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
      longDescription: [
        `${seed.name} #${String(seed.tokenId).padStart(3, '0')} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
        'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
      ],
      attributes: ['Óculos', 'Esmeralda', 'Raro'],
      rating: 4.8,
      reviewCount: 19,
      gallery,
      editions: editionIds.map((editionId) => ({
        id: editionId,
        label: EDITION_SUPPLY[editionId].label,
        supply: EDITION_SUPPLY[editionId].supply,
        available: EDITION_SUPPLY[editionId].supply,
      })),
      contractAddress: `0x${hexDigest(id, 40)}`,
      royaltyPercent: 5,
    }
  })
}

export interface SeedUser {
  id: string
  username: string
  email: string
  displayName: string
  password: string
  ensName: string
  walletAlias: string
}

export const SEED_USERS: SeedUser[] = [
  { id: 'user-ana', username: 'ana', email: 'ana@kurio.test', displayName: 'Ana Souza', password: 'Kurio@123', ensName: 'ana', walletAlias: 'Principal' },
  { id: 'user-bruno', username: 'bruno', email: 'bruno@kurio.test', displayName: 'Bruno Lima', password: 'Kurio@456', ensName: 'bruno', walletAlias: 'Reserva' },
]
