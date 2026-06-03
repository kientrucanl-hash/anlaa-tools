import { REGION_PRICES, WORK_ITEM_DIMS, DEFAULT_REGION } from '@/lib/constants'
import { buildEstimateWorkbookData } from '@/lib/univer/template'
import type { ConstructionItem, IWorkbookData } from '@/lib/univer/types'

export interface LegacyTemplateItem {
  key: string
  name: string
  unit?: string
  price?: number
}

export interface LegacyProjectTemplate {
  id: string
  builtinId: number
  name: string
  category: string
  description: string
  icon: string
  sections: Array<{
    name: string
    items: LegacyTemplateItem[]
  }>
}

const WORK_PRICE_META: Record<string, { name: string; unit: string }> = {
  'masonry-110': { name: 'Xây tường gạch 110 (tường đơn)', unit: 'm2' },
  'masonry-220': { name: 'Xây tường gạch 220 (tường đôi)', unit: 'm2' },
  'masonry-aac-110': { name: 'Xây tường gạch AAC 100mm', unit: 'm2' },
  'plastering-1-face': { name: 'Trát tường xi măng 1 mặt', unit: 'm2' },
  'plastering-2-face': { name: 'Trát tường xi măng 2 mặt', unit: 'm2' },
  'plastering-ceiling': { name: 'Trát trần bê tông', unit: 'm2' },
  'skim-coat': { name: 'Bả bột putty', unit: 'm2' },
  'paint-interior': { name: 'Sơn tường trong nhà', unit: 'm2' },
  'paint-exterior': { name: 'Sơn tường ngoài nhà', unit: 'm2' },
  'paint-ceiling': { name: 'Sơn trần nhà', unit: 'm2' },
  'screed': { name: 'Cán nền phẳng xi măng cát', unit: 'm2' },
  'tiling-floor': { name: 'Lát nền gạch (gạch + keo + nhân công)', unit: 'm2' },
  'tiling-wall': { name: 'Ốp tường gạch (gạch + keo + nhân công)', unit: 'm2' },
  'waterproof-floor': { name: 'Chống thấm sàn', unit: 'm2' },
  'waterproof-wall': { name: 'Chống thấm tường', unit: 'm2' },
  'stone-floor': { name: 'Lát đá sàn', unit: 'm2' },
  'stone-wall': { name: 'Ốp đá tường', unit: 'm2' },
  'ceiling-gypsum': { name: 'Trần thạch cao', unit: 'm2' },
  'ceiling-wood': { name: 'Trần gỗ/nhựa PVC', unit: 'm2' },
  formwork: { name: 'Ván khuôn', unit: 'm2' },
  excavation: { name: 'Đào đất hố móng', unit: 'm3' },
  backfill: { name: 'Đắp đất', unit: 'm3' },
  'concrete-footing': { name: 'Bê tông móng (vật tư + nhân công)', unit: 'm3' },
  'concrete-column': { name: 'Bê tông cột (vật tư + nhân công)', unit: 'm3' },
  'concrete-beam': { name: 'Bê tông dầm (vật tư + nhân công)', unit: 'm3' },
  'concrete-slab': { name: 'Bê tông sàn (vật tư + nhân công)', unit: 'm3' },
  'concrete-stair': { name: 'Bê tông cầu thang (vật tư + nhân công)', unit: 'm3' },
  railing: { name: 'Lan can/tay vịn', unit: 'md' },
  fence: { name: 'Hàng rào', unit: 'md' },
  pathway: { name: 'Đường dạo/lát vỉa hè', unit: 'm2' },
  door: { name: 'Lắp cửa đi', unit: 'cái' },
  window: { name: 'Lắp cửa sổ', unit: 'cái' },
  sanitary: { name: 'Thiết bị vệ sinh', unit: 'bộ' },
  electrical: { name: 'Hệ thống điện âm tường', unit: 'm' },
  plumbing: { name: 'Hệ thống cấp/thoát nước', unit: 'm' },
}

export const DEFAULT_WORK_ITEM_PRICES: Record<string, { name: string; unit: string; price: number }> =
  Object.fromEntries(
    Object.entries(WORK_PRICE_META).map(([key, meta]) => [
      key,
      { ...meta, price: REGION_PRICES[DEFAULT_REGION].prices[key] ?? 0 },
    ])
  )

export const LEGACY_PROJECT_TEMPLATES: LegacyProjectTemplate[] = [
  {
    id: 'caito-chungcu',
    builtinId: 100001,
    name: 'Cải tạo căn hộ chung cư',
    category: 'cai-tao',
    description: 'Tháo dỡ, hoàn thiện nội thất toàn bộ (không đụng kết cấu)',
    icon: 'building-2',
    sections: [
      {
        name: 'Phần I - Tháo dỡ & Chuẩn bị',
        items: [
          { key: 'custom', name: 'Tháo dỡ vách gạch cũ', unit: 'm2', price: 80000 },
          { key: 'custom', name: 'Tháo dỡ gạch lát nền cũ', unit: 'm2', price: 60000 },
          { key: 'custom', name: 'Tháo dỡ trần thạch cao cũ', unit: 'm2', price: 50000 },
          { key: 'custom', name: 'Chuyển phế thải ra ngoài', unit: 'm3', price: 250000 },
        ],
      },
      {
        name: 'Phần II - Xây & Trát',
        items: [
          { key: 'masonry-110', name: 'Xây tường ngăn phòng gạch 110' },
          { key: 'plastering-2-face', name: 'Trát tường 2 mặt' },
          { key: 'plastering-ceiling', name: 'Trát trần bê tông' },
        ],
      },
      {
        name: 'Phần III - Điện & Nước',
        items: [
          { key: 'electrical', name: 'Hệ thống điện âm tường (đi dây + ổ cắm + công tắc)' },
          { key: 'plumbing', name: 'Hệ thống cấp/thoát nước (ống âm tường)' },
        ],
      },
      {
        name: 'Phần IV - Hoàn thiện tường & trần',
        items: [
          { key: 'skim-coat', name: 'Bả bột putty tường trong' },
          { key: 'paint-interior', name: 'Sơn tường trong 2 nước' },
          { key: 'ceiling-gypsum', name: 'Trần thạch cao phẳng' },
          { key: 'paint-ceiling', name: 'Sơn trần 2 nước' },
        ],
      },
      {
        name: 'Phần V - Nền & Ốp lát',
        items: [
          { key: 'waterproof-floor', name: 'Chống thấm vệ sinh' },
          { key: 'screed', name: 'Cán nền xi măng cát san phẳng' },
          { key: 'tiling-floor', name: 'Lát nền gạch ceramic/porcelain' },
          { key: 'tiling-wall', name: 'Ốp tường nhà vệ sinh' },
        ],
      },
      {
        name: 'Phần VI - Cửa & Hoàn thiện khác',
        items: [
          { key: 'door', name: 'Lắp cửa đi (gỗ công nghiệp)' },
          { key: 'window', name: 'Lắp cửa sổ / cửa ban công (nhôm)' },
          { key: 'sanitary', name: 'Lắp đặt thiết bị vệ sinh (lavabo, bồn cầu, vòi...)' },
        ],
      },
    ],
  },
  {
    id: 'xaymoi-nha-dan',
    builtinId: 100002,
    name: 'Xây mới nhà dân (1 tầng)',
    category: 'xay-moi',
    description: 'Từ đào móng đến hoàn thiện cơ bản nhà ở 1 tầng',
    icon: 'home',
    sections: [
      {
        name: 'Phần I - Công tác đất & Móng',
        items: [
          { key: 'excavation', name: 'Đào đất móng bằng máy' },
          { key: 'backfill', name: 'Đắp đất san lấp' },
          { key: 'concrete-footing', name: 'Bê tông móng M200 (đá 1x2)' },
        ],
      },
      {
        name: 'Phần II - Kết cấu BTCT',
        items: [
          { key: 'formwork', name: 'Ván khuôn cột, dầm, sàn' },
          { key: 'concrete-column', name: 'Bê tông cột M200' },
          { key: 'concrete-beam', name: 'Bê tông dầm M200' },
          { key: 'concrete-slab', name: 'Bê tông sàn mái M200 (dày 10cm)' },
        ],
      },
      {
        name: 'Phần III - Xây tường',
        items: [
          { key: 'masonry-220', name: 'Xây tường ngoài gạch 220 (tường đôi)' },
          { key: 'masonry-110', name: 'Xây tường trong gạch 110 (tường đơn)' },
        ],
      },
      {
        name: 'Phần IV - Hoàn thiện',
        items: [
          { key: 'plastering-2-face', name: 'Trát tường trong + ngoài 2 mặt' },
          { key: 'plastering-ceiling', name: 'Trát trần bê tông' },
          { key: 'skim-coat', name: 'Bả bột putty trong nhà' },
          { key: 'paint-interior', name: 'Sơn tường trong 2 nước' },
          { key: 'paint-exterior', name: 'Sơn tường ngoài chống thấm' },
        ],
      },
      {
        name: 'Phần V - Nền & Ốp lát',
        items: [
          { key: 'screed', name: 'Cán nền xi măng cát' },
          { key: 'tiling-floor', name: 'Lát nền gạch' },
          { key: 'tiling-wall', name: 'Ốp tường nhà vệ sinh' },
          { key: 'waterproof-floor', name: 'Chống thấm sàn vệ sinh + mái' },
        ],
      },
      {
        name: 'Phần VI - Điện, Nước & Hoàn thiện khác',
        items: [
          { key: 'electrical', name: 'Hệ thống điện âm tường' },
          { key: 'plumbing', name: 'Hệ thống cấp/thoát nước' },
          { key: 'door', name: 'Lắp cửa đi' },
          { key: 'window', name: 'Lắp cửa sổ' },
          { key: 'sanitary', name: 'Thiết bị vệ sinh' },
          { key: 'railing', name: 'Lan can cầu thang' },
        ],
      },
    ],
  },
  {
    id: 'caito-wc',
    builtinId: 100003,
    name: 'Cải tạo nhà vệ sinh',
    category: 'cai-tao',
    description: 'Tháo dỡ và hoàn thiện lại toàn bộ 1 nhà vệ sinh',
    icon: 'droplets',
    sections: [
      {
        name: 'Phần I - Tháo dỡ',
        items: [
          { key: 'custom', name: 'Tháo gạch ốp tường cũ', unit: 'm2', price: 80000 },
          { key: 'custom', name: 'Tháo gạch lát nền cũ', unit: 'm2', price: 70000 },
          { key: 'custom', name: 'Tháo thiết bị vệ sinh cũ', unit: 'bộ', price: 500000 },
        ],
      },
      {
        name: 'Phần II - Chống thấm & Hoàn thiện',
        items: [
          { key: 'waterproof-floor', name: 'Chống thấm sàn vệ sinh (quét 2 lớp)' },
          { key: 'waterproof-wall', name: 'Chống thấm tường (quét 1,5m)' },
          { key: 'screed', name: 'Cán nền xi măng tạo dốc thoát nước' },
          { key: 'tiling-floor', name: 'Lát nền gạch chống trơn' },
          { key: 'tiling-wall', name: 'Ốp tường gạch ceramic/porcelain' },
        ],
      },
      {
        name: 'Phần III - Thiết bị & Hoàn thiện',
        items: [
          { key: 'plumbing', name: 'Thay ống cấp/thoát nước' },
          { key: 'sanitary', name: 'Lắp thiết bị vệ sinh mới' },
          { key: 'electrical', name: 'Điện chiếu sáng + quạt hút' },
          { key: 'door', name: 'Cửa nhôm kính chống nước' },
        ],
      },
    ],
  },
  {
    id: 'xay-tron-goi',
    builtinId: 100004,
    name: 'Xây nhà trọn gói (2-3 tầng)',
    category: 'xay-moi',
    description: 'Từ phá dỡ / đào móng đến hoàn thiện bàn giao nhà 2-3 tầng liền kề / biệt thự nhỏ',
    icon: 'building',
    sections: [
      {
        name: 'Phần I - Phá dỡ & Chuẩn bị mặt bằng',
        items: [
          { key: 'custom', name: 'Phá dỡ công trình cũ (nếu có)', unit: 'm2', price: 150000 },
          { key: 'excavation', name: 'Đào đất hố móng bằng máy' },
          { key: 'backfill', name: 'Đắp đất san lấp + đầm chặt' },
          { key: 'custom', name: 'Xử lý nền, đổ bê tông lót móng C10', unit: 'm2', price: 180000 },
        ],
      },
      {
        name: 'Phần II - Móng & Tầng hầm / Tầng 1',
        items: [
          { key: 'concrete-footing', name: 'Bê tông móng đơn / móng băng M200' },
          { key: 'formwork', name: 'Ván khuôn móng + giằng móng' },
          { key: 'concrete-column', name: 'Bê tông cột tầng 1 M200' },
          { key: 'concrete-beam', name: 'Bê tông dầm sàn tầng 2 M200' },
          { key: 'concrete-slab', name: 'Bê tông sàn tầng 2 (dày 10cm) M200' },
          { key: 'masonry-220', name: 'Xây tường ngoài tầng 1 gạch 220' },
          { key: 'masonry-110', name: 'Xây tường trong tầng 1 gạch 110' },
        ],
      },
      {
        name: 'Phần III - Kết cấu tầng 2',
        items: [
          { key: 'formwork', name: 'Ván khuôn cột dầm sàn tầng 2' },
          { key: 'concrete-column', name: 'Bê tông cột tầng 2 M200' },
          { key: 'concrete-beam', name: 'Bê tông dầm sàn tầng 3 M200' },
          { key: 'concrete-slab', name: 'Bê tông sàn tầng 3 (dày 10cm) M200' },
          { key: 'masonry-220', name: 'Xây tường ngoài tầng 2 gạch 220' },
          { key: 'masonry-110', name: 'Xây tường trong tầng 2 gạch 110' },
        ],
      },
      {
        name: 'Phần IV - Kết cấu tầng 3 & Mái',
        items: [
          { key: 'formwork', name: 'Ván khuôn cột dầm sàn tầng 3' },
          { key: 'concrete-column', name: 'Bê tông cột tầng 3 M200' },
          { key: 'concrete-beam', name: 'Bê tông dầm mái M200' },
          { key: 'concrete-slab', name: 'Bê tông sàn mái (dày 10cm) M200' },
          { key: 'masonry-110', name: 'Xây tường trong tầng 3 gạch 110' },
          { key: 'waterproof-floor', name: 'Chống thấm sàn mái (2 lớp)' },
        ],
      },
      {
        name: 'Phần V - Cầu thang & Lan can',
        items: [
          { key: 'concrete-stair', name: 'Bê tông cầu thang toàn nhà M200' },
          { key: 'railing', name: 'Lan can cầu thang + ban công (inox/sắt)' },
          { key: 'tiling-floor', name: 'Lát bậc cầu thang gạch granite' },
        ],
      },
      {
        name: 'Phần VI - Hoàn thiện tường & trần',
        items: [
          { key: 'plastering-2-face', name: 'Trát tường trong + ngoài 2 mặt toàn nhà' },
          { key: 'plastering-ceiling', name: 'Trát trần bê tông toàn nhà' },
          { key: 'skim-coat', name: 'Bả bột putty tường trong' },
          { key: 'paint-interior', name: 'Sơn tường trong 2 nước phủ' },
          { key: 'paint-exterior', name: 'Sơn ngoại thất chống thấm 2 nước' },
          { key: 'ceiling-gypsum', name: 'Trần thạch cao phòng khách + phòng ngủ' },
          { key: 'paint-ceiling', name: 'Sơn trần 2 nước' },
        ],
      },
      {
        name: 'Phần VII - Nền & Ốp lát',
        items: [
          { key: 'waterproof-floor', name: 'Chống thấm sàn vệ sinh các tầng' },
          { key: 'screed', name: 'Cán nền xi măng cát toàn nhà' },
          { key: 'tiling-floor', name: 'Lát nền gạch ceramic/porcelain toàn nhà' },
          { key: 'tiling-wall', name: 'Ốp tường gạch các phòng vệ sinh' },
          { key: 'stone-floor', name: 'Lát đá granite sảnh + phòng khách (nếu có)' },
        ],
      },
      {
        name: 'Phần VIII - Điện & Nước',
        items: [
          { key: 'electrical', name: 'Hệ thống điện âm tường toàn nhà (dây + CB + ổ cắm)' },
          { key: 'plumbing', name: 'Hệ thống cấp/thoát nước toàn nhà' },
          { key: 'sanitary', name: 'Lắp đặt thiết bị vệ sinh (mỗi phòng tắm)' },
        ],
      },
      {
        name: 'Phần IX - Cửa & Hoàn thiện khác',
        items: [
          { key: 'door', name: 'Lắp cửa đi chính + cửa phòng (gỗ công nghiệp)' },
          { key: 'window', name: 'Lắp cửa sổ / cửa ban công nhôm kính' },
          { key: 'fence', name: 'Tường rào + cổng (nếu có)' },
          { key: 'pathway', name: 'Sân trước + lối đi lát gạch' },
        ],
      },
    ],
  },
  {
    id: 'son-noi-that',
    builtinId: 100005,
    name: 'Sơn & Hoàn thiện nội thất',
    category: 'hoan-thien',
    description: 'Bả putty + sơn tường trần toàn nhà / căn hộ',
    icon: 'paint-roller',
    sections: [
      {
        name: 'Phần I - Chuẩn bị bề mặt',
        items: [
          { key: 'custom', name: 'Đục tẩy vết thấm, nứt, bong tróc', unit: 'm2', price: 30000 },
          { key: 'custom', name: 'Bơm keo chống nứt khe hở', unit: 'md', price: 25000 },
        ],
      },
      {
        name: 'Phần II - Bả & Sơn tường',
        items: [
          { key: 'skim-coat', name: 'Bả bột putty tường trong (2 lớp + đánh giấy)' },
          { key: 'paint-interior', name: 'Sơn tường trong 1 nước lót + 2 nước phủ' },
          { key: 'paint-exterior', name: 'Sơn ngoại thất chống thấm (nếu có)' },
        ],
      },
      {
        name: 'Phần III - Trần',
        items: [
          { key: 'ceiling-gypsum', name: 'Trần thạch cao (nếu cải tạo)' },
          { key: 'paint-ceiling', name: 'Sơn trần 1 nước lót + 2 nước phủ' },
        ],
      },
    ],
  },
]

export function findBuiltinTemplate(id: number): LegacyProjectTemplate | undefined {
  return LEGACY_PROJECT_TEMPLATES.find((template) => template.builtinId === id)
}

export function buildTemplateConstructionItems(template: LegacyProjectTemplate): ConstructionItem[] {
  const items: ConstructionItem[] = []
  template.sections.forEach((section, sectionIndex) => {
    items.push({
      id: `${template.id}-section-${sectionIndex + 1}`,
      type: 'section',
      stt: `I${sectionIndex + 1}`,
      name: section.name,
    })

    section.items.forEach((item, itemIndex) => {
      const dim = WORK_ITEM_DIMS[item.key]
      const price = item.price ?? DEFAULT_WORK_ITEM_PRICES[item.key]?.price ?? 0
      items.push({
        id: `${template.id}-${sectionIndex + 1}-${itemIndex + 1}`,
        type: item.key,
        name: item.name,
        unit: item.unit ?? dim?.unit ?? DEFAULT_WORK_ITEM_PRICES[item.key]?.unit ?? 'm2',
        qty: 0,
        unitPriceMat: price,
        unitPriceLab: 0,
        rows: [{ name: 'Nhập khối lượng thực tế', length: null, width: null, height: null, n: 1, coeff: 1 }],
      })
    })
  })
  return items
}

export function buildBuiltinTemplateSnapshot(template: LegacyProjectTemplate): IWorkbookData {
  return buildEstimateWorkbookData(
    { name: template.name, address: '' },
    buildTemplateConstructionItems(template),
    Object.fromEntries(Object.entries(DEFAULT_WORK_ITEM_PRICES).map(([key, value]) => [key, value.price]))
  )
}

export function toBuiltinTemplateSummary(template: LegacyProjectTemplate) {
  return {
    id: template.builtinId,
    legacyId: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    isActive: true,
    isBuiltin: true,
    createdAt: null,
    updatedAt: null,
  }
}
