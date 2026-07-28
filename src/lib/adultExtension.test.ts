import { describe, expect, it } from 'vitest'
import {
  defaultAdultExtension,
  parseAdultExtension,
  serializeAdultExtension,
  syncAdultScenes,
  validateAdultExtension,
} from './adultExtension'

describe('adult extension contract', () => {
  it('keeps the optional file absent until the creator opts in', () => {
    expect(validateAdultExtension('', ['home'])).toEqual([])
  })

  it('requires an adult assertion and known base scenes', () => {
    const doc = defaultAdultExtension()
    doc.scenes.library = {
      direction: '',
      action_flow: '',
      dialogue_guidance: '',
    }
    const errors = validateAdultExtension(serializeAdultExtension(doc), ['home'])
    expect(errors.some(error => error.includes('成年人'))).toBe(true)
    expect(errors.some(error => error.includes('library'))).toBe(true)
  })

  it('round-trips and synchronizes ordinary scene ids', () => {
    const doc = defaultAdultExtension()
    doc.character_is_adult = true
    const synced = syncAdultScenes(doc, ['home', 'park'])
    const parsed = parseAdultExtension(serializeAdultExtension(synced))
    expect(Object.keys(parsed.scenes)).toEqual(['home', 'park'])
    expect(validateAdultExtension(serializeAdultExtension(parsed), ['home', 'park'])).toEqual([])
  })
})
