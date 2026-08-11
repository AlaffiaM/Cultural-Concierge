const {
  ALLOWED_TYPES,
  BANNED_TERMS,
  isBanned,
  matchesCoreVibe,
  classifyType,
} = require('../src/utils/eventClassifier')

describe('eventClassifier', () => {
  describe('ALLOWED_TYPES', () => {
    test('exposes exactly the approved admin taxonomy', () => {
      expect(ALLOWED_TYPES).toEqual([
        'Festival', 'Exhibition', 'Workshop', 'Performance', 'Dining',
        'Wellness', 'Music', 'Art', 'Pop-up', 'Brunch', 'Sundowner',
      ])
    })
  })

  describe('isBanned', () => {
    test.each(['conference', 'summit', 'forum', 'expo', 'symposium', 'corporate', 'b2b'])(
      'rejects %s events',
      (term) => {
        expect(isBanned(`Africa ${term.toUpperCase()} 2026`, 'Networking with industry leaders')).toBe(true)
      }
    )

    test('rejects events flagged in the description only', () => {
      expect(isBanned('Business Leaders Meetup', 'Annual corporate summit for founders')).toBe(true)
    })

    test('keeps vibe events', () => {
      expect(isBanned('Sip & Paint Night', 'Relaxed evening painting with friends')).toBe(false)
      expect(isBanned('Sunset Yoga on the Beach', '')).toBe(false)
    })

    test('uses word boundaries so substrings do not false-positive', () => {
      expect(isBanned('Jazz in the Park', 'Live band performance')).toBe(false)
    })
  })

  describe('matchesCoreVibe', () => {
    test.each([
      ['Sunset Yoga Retreat', ''],
      ['Sip & Paint', ''],
      ['Contemporary Art Exhibition', ''],
      ['Jazz Festival Weekend', ''],
      ['Live Music at the Rooftop', ''],
      ['Sunday Pop-up Market', ''],
      ['Brunch by the Pool', ''],
      ['Pottery Workshop', ''],
      ['Stand-up Comedy Night', ''],
    ])('accepts %s', (name) => {
      expect(matchesCoreVibe(name, '')).toBe(true)
    })

    test.each([
      ['Annual Fintech Summit', ''],
      ['Regional Conference on Investment', ''],
      ['B2B Trade Expo', ''],
    ])('rejects corporate %s', (name) => {
      expect(matchesCoreVibe(name, '')).toBe(false)
    })

    test('matches from description when the name is generic', () => {
      expect(matchesCoreVibe('Saturday Gathering', 'Live music and a food market')).toBe(true)
    })
  })

  describe('classifyType', () => {
    test.each([
      ['Sunset Yoga Retreat', 'Wellness'],
      ['Sip & Paint Night', 'Workshop'],
      ['Art Exhibition Opening', 'Exhibition'],
      ['Jazz Festival', 'Festival'],
      ['Live Music at the Rooftop', 'Music'],
      ['Stand-up Comedy Night', 'Performance'],
      ['Sunday Pop-up Market', 'Pop-up'],
      ['Poolside Brunch', 'Brunch'],
      ['Wine Tasting Dinner', 'Dining'],
      ['Sundowner Cruise', 'Sundowner'],
      ['Acrylic Painting Class', 'Workshop'],
      ['Contemporary Art Tour', 'Art'],
    ])('maps %s to %s', (name, expected) => {
      expect(classifyType(name, '')).toBe(expected)
    })

    test('returns empty string when unclassifiable', () => {
      expect(classifyType('Something Vague', '')).toBe('')
    })

    test('always returns one of ALLOWED_TYPES when non-empty', () => {
      const types = ['Cooking Masterclass with Chef', 'Kizomba Dance Party', 'Amapiano Gig']
      for (const name of types) {
        const type = classifyType(name, '')
        expect(ALLOWED_TYPES).toContain(type)
      }
    })
  })
})
