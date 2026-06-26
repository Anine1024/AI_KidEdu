const Router = require('koa-router');
const {
  upload, initUpload, uploadChunk, getUploadStatus,
  completeUpload, abortUpload,
  list, detail, play, remove
} = require('../controllers/videoController');

const router = new Router({ prefix: '/api/videos' });

// 小文件直传
router.post('/upload', upload);
// 分片上传
router.post('/upload/init', initUpload);
router.post('/upload/chunk', uploadChunk);
router.get('/upload/status/:uploadId', getUploadStatus);
router.post('/upload/complete', completeUpload);
router.delete('/upload/:uploadId', abortUpload);

// 视频列表 & 播放
router.get('/', list);
router.get('/:id', detail);
router.get('/:id/file', play);
router.delete('/:id', remove);

module.exports = router;
