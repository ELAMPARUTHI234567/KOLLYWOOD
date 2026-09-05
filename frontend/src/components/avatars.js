// Animal avatar data
export const AVATARS = [
  { id: 'dog',    emoji: '🐶', name: 'Dog'    },
  { id: 'cat',    emoji: '🐱', name: 'Cat'    },
  { id: 'fox',    emoji: '🦊', name: 'Fox'    },
  { id: 'panda',  emoji: '🐼', name: 'Panda'  },
  { id: 'tiger',  emoji: '🐯', name: 'Tiger'  },
  { id: 'frog',   emoji: '🐸', name: 'Frog'   },
  { id: 'monkey', emoji: '🐵', name: 'Monkey' },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
  { id: 'lion',   emoji: '🦁', name: 'Lion'   },
  { id: 'bear',   emoji: '🐻', name: 'Bear'   },
  { id: 'koala',  emoji: '🐨', name: 'Koala'  },
  { id: 'pig',    emoji: '🐷', name: 'Pig'    },
  { id: 'wolf',   emoji: '🐺', name: 'Wolf'   },
  { id: 'cow',    emoji: '🐮', name: 'Cow'    },
  { id: 'penguin',emoji: '🐧', name: 'Penguin'},
  { id: 'chick',  emoji: '🐥', name: 'Chick'  },
];

export function getAvatarEmoji(id) {
  return AVATARS.find(a => a.id === id)?.emoji || '🐾';
}

export function getAvatarName(id) {
  return AVATARS.find(a => a.id === id)?.name || id;
}
