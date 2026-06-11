import { generatePalette } from '@/core/palette'
import type { WheelConfig } from '@/core/types'

type TemplateDef = Omit<WheelConfig, 'id' | 'createdAt' | 'updatedAt'>

function tpl(title: string, labels: [string, string][]): TemplateDef {
  const colors = generatePalette(labels.length)
  return {
    title,
    excludeMode: false,
    sectors: labels.map(([label, emoji], i) => ({
      id: '',
      label,
      emoji,
      color: colors[i] ?? '#888888',
      weight: 1,
    })),
  }
}

export const TEMPLATES: TemplateDef[] = [
  tpl('今晚吃什么 / What for dinner?', [
    ['Pizza', '🍕'],
    ['Sushi', '🍣'],
    ['Ramen', '🍜'],
    ['Burger', '🍔'],
    ['Salad', '🥗'],
    ['Tacos', '🌮'],
  ]),
  tpl('家务分配 / Chores', [
    ['Dishes', '🍽️'],
    ['Vacuum', '🧹'],
    ['Laundry', '👔'],
    ['Trash', '🗑️'],
    ['Cook', '🍳'],
  ]),
  tpl('团建活动 / Team Activity', [
    ['Escape Room', '🔐'],
    ['Bowling', '🎳'],
    ['Karaoke', '🎤'],
    ['Picnic', '🧺'],
    ['Game Night', '🎮'],
    ['Movie', '🎬'],
    ['Hiking', '🥾'],
  ]),
  tpl('真心话大冒险 / Truth or Dare', [
    ['Truth', '💬'],
    ['Dare', '🎯'],
    ['Truth', '💬'],
    ['Dare', '🎯'],
    ['Skip', '⏭️'],
  ]),
  tpl('随机点名 / Pick Someone', [
    ['Alice', '👩'],
    ['Bob', '👨'],
    ['Carol', '🧑'],
    ['Dave', '🧔'],
    ['Eve', '👩‍🦰'],
    ['Frank', '👨‍🦳'],
  ]),
  tpl('周末去哪 / Weekend Plan', [
    ['Beach', '🏖️'],
    ['Museum', '🏛️'],
    ['Park', '🌳'],
    ['Cinema', '🎦'],
    ['Home', '🏠'],
    ['Mall', '🛍️'],
  ]),
  tpl('运动 / Exercise', [
    ['Run 5km', '🏃'],
    ['Yoga', '🧘'],
    ['Weights', '🏋️'],
    ['Swim', '🏊'],
    ['Cycle', '🚴'],
    ['Rest', '😴'],
  ]),
  tpl('颜色 / Colors', [
    ['Red', '🔴'],
    ['Orange', '🟠'],
    ['Yellow', '🟡'],
    ['Green', '🟢'],
    ['Blue', '🔵'],
    ['Purple', '🟣'],
  ]),
]
