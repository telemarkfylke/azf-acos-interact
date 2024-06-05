const { addLopenummerIfEqualFileName } = require('../lib/add-lopenummer-if-equal-filename')

const testFiles = [
  {
    _: 'hei.pdf',
    $: {
      BESK: 'hei.pdf'
    }
  },
  {
    _: 'hade.pdf',
    $: {
      BESK: 'hade.pdf'
    }
  },
  {
    _: 'hu.png',
    $: {
      BESK: 'hu.png'
    }
  },
  {
    _: 'hei.pdf',
    $: {
      BESK: 'hei.pdf'
    }
  },
  {
    _: 'hei.pdf',
    $: {
      BESK: 'heicustomhahah'
    }
  },
  {
    _: 'hei.pdf',
    $: {
      BESK: 'heicustomhehe'
    }
  },
  {
    _: 'Nei.xml',
    $: {
      BESK: 'Nei.xml'
    }
  }
]

const testFiles2 = [
  {
    _: 'hei.pdf',
    $: {
      BESK: 'hei.pdf'
    }
  },
  {
    _: 'hade.pdf',
    $: {
      BESK: 'hade.pdf'
    }
  },
  {
    _: 'hu.png',
    $: {
      BESK: 'hu.png'
    }
  }
]

const testFiles3 = [
  {
    _: 'hei.pdf',
    $: {
      BESK: 'heicustombesk'
    }
  },
  {
    _: 'hade.tutut.pdf',
    $: {
      BESK: 'hade.tutut.pdf'
    }
  },
  {
    _: 'hu.png',
    $: {
      BESK: 'hu.png'
    }
  },
  {
    _: 'hei.pdf',
    $: {
      BESK: 'hei.pdf'
    }
  },
  {
    _: 'hade.tutut.pdf',
    $: {
      BESK: 'hade.tutut.pdf'
    }
  },
  {
    _: 'hei.pdf',
    $: {
      BESK: 'hei.pdf'
    }
  }
]

describe('Checking if addLopenummer runs correct when', () => {
  test('4 hei.pdf are present in the list', () => {
    const addLopenummerResult = addLopenummerIfEqualFileName(testFiles)
    expect(addLopenummerResult[0]._).toBe('hei_1.pdf')
    expect(addLopenummerResult[3]._).toBe('hei_2.pdf')
    expect(addLopenummerResult[4]._).toBe('hei_3.pdf')
    expect(addLopenummerResult[5]._).toBe('hei_4.pdf')
    expect(addLopenummerResult[0].$.BESK).toBe('hei_1')
    expect(addLopenummerResult[3].$.BESK).toBe('hei_2')
    expect(addLopenummerResult[4].$.BESK).toBe('heicustomhahah')
    expect(addLopenummerResult[5].$.BESK).toBe('heicustomhehe')
  })
  test('No duplicate names are present in the list', () => {
    const addLopenummerResult = addLopenummerIfEqualFileName(testFiles2)
    expect(addLopenummerResult[0]._).toBe('hei.pdf')
    expect(addLopenummerResult[1]._).toBe('hade.pdf')
    expect(addLopenummerResult[2]._).toBe('hu.png')
    expect(addLopenummerResult[0].$.BESK).toBe('hei.pdf')
    expect(addLopenummerResult[1].$.BESK).toBe('hade.pdf')
    expect(addLopenummerResult[2].$.BESK).toBe('hu.png')
  })
  test('2 hei.pdf, and 2 hade.tutut.pdf are present in the list', () => {
    const addLopenummerResult = addLopenummerIfEqualFileName(testFiles3)
    expect(addLopenummerResult[0]._).toBe('hei_1.pdf')
    expect(addLopenummerResult[3]._).toBe('hei_2.pdf')
    expect(addLopenummerResult[1]._).toBe('hade.tutut_1.pdf')
    expect(addLopenummerResult[4]._).toBe('hade.tutut_2.pdf')
    expect(addLopenummerResult[0].$.BESK).toBe('heicustombesk')
    expect(addLopenummerResult[3].$.BESK).toBe('hei_1')
    expect(addLopenummerResult[1].$.BESK).toBe('hade.tutut_1')
    expect(addLopenummerResult[4].$.BESK).toBe('hade.tutut_2')
  })
})
