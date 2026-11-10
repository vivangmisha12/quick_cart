const Banner = require('../models/Banner');

exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching banners', error: error.message });
  }
};

exports.getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active banners', error: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, subtitle, cta, link, bg, type, isActive } = req.body;
    let imageUrl = '';

    if (req.files && req.files.length > 0) {
      imageUrl = `/uploads/${req.files[0].filename}`;
    }

    const newBanner = new Banner({
      title,
      subtitle,
      cta,
      link,
      bg,
      type,
      isActive: isActive === 'true' || isActive === true,
      image: imageUrl
    });

    await newBanner.save();
    res.status(201).json(newBanner);
  } catch (error) {
    res.status(500).json({ message: 'Error creating banner', error: error.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { title, subtitle, cta, link, bg, type, isActive } = req.body;
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    banner.title = title || banner.title;
    banner.subtitle = subtitle !== undefined ? subtitle : banner.subtitle;
    banner.cta = cta || banner.cta;
    banner.link = link || banner.link;
    banner.bg = bg || banner.bg;
    banner.type = type || banner.type;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;

    if (req.files && req.files.length > 0) {
      banner.image = `/uploads/${req.files[0].filename}`;
    }

    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error updating banner', error: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    await banner.deleteOne();
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting banner', error: error.message });
  }
};
