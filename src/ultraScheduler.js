// Speed Ultra scheduler module
const ultraState = {
  accounts: [
    { id: 'acc_tt_1', platform: 'tiktok', name: '@viralio_official', picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=tiktok', lastError: null },
    { id: 'acc_yt_1', platform: 'youtube', name: 'Viralio Shorts', picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=youtube', lastError: null },
    { id: 'acc_ig_1', platform: 'instagram', name: 'viralio.reels', picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=instagram', lastError: null }
  ],
  program: {
    saved: true,
    accountIds: ['acc_tt_1', 'acc_yt_1'],
    slots: ['12:00', '19:00'],
    hashtags: ['#viral', '#fyp', '#speed'],
    tiktokMode: 'DIRECT_POST',
    youtubeCategory: '22'
  },
  queue: [
    {
      id: 'q_post_1',
      title: 'Cum să faci clipuri virale în 2026',
      scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(),
      status: 'scheduled',
      targets: [
        { platform: 'tiktok', name: '@viralio_official', status: 'pending' },
        { platform: 'youtube', name: 'Viralio Shorts', status: 'pending' }
      ]
    }
  ],
  recent: [],
  nextSlot: new Date(Date.now() + 3600000 * 8).toISOString(),
  schedulerUrl: 'https://scheduler.viralio.ro'
};

function getState() {
  return ultraState;
}

function updateProgram(body) {
  if (body.accountIds) ultraState.program.accountIds = body.accountIds;
  if (body.slots) ultraState.program.slots = body.slots;
  if (body.hashtags) {
    ultraState.program.hashtags = Array.isArray(body.hashtags)
      ? body.hashtags
      : String(body.hashtags).split(/\s+/).filter(Boolean);
  }
  if (body.tiktokMode) ultraState.program.tiktokMode = body.tiktokMode;
  if (body.youtubeCategory) ultraState.program.youtubeCategory = body.youtubeCategory;
  ultraState.program.saved = true;
  return ultraState;
}

function cancelQueued(id) {
  const idx = ultraState.queue.findIndex(q => q.id === id);
  if (idx !== -1) {
    ultraState.queue.splice(idx, 1);
    return { ok: true, refunded: 2, state: ultraState };
  }
  return { ok: false, error: 'Post not found in queue' };
}

function getTikTokInfo() {
  return {
    ok: true,
    creators: {
      acc_tt_1: {
        nickname: 'Viralio',
        username: 'viralio_official',
        privacyOptions: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
        commentDisabled: false,
        duetDisabled: false,
        stitchDisabled: false
      }
    }
  };
}

module.exports = {
  getState,
  updateProgram,
  cancelQueued,
  getTikTokInfo
};
