import React, { useState } from 'react';
import { Download, Copy, Image as ImageIcon, Layers, CheckCircle2, Languages, FileText, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { isVideoUrl } from '../lib/utils';
import { PlatformBadge, PLATFORM_META } from './SocialIcons';

interface PublishHubPost {
  id: string;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  format?: 'estatico' | 'reel' | 'carrusel';
  idea: string;
  title?: string;
  date: any;
  copyCaption?: string;
  copyCaptionTranslated?: string;
  translationEnabled?: boolean;
  currentDesignUrl?: string;
  reelCoverUrl?: string;
  carouselUrls?: string[];
  projectId?: string;
}

interface PublishHubViewProps {
  posts: PublishHubPost[];
  onSelectPost: (post: any) => void;
  loading?: boolean;
}

function slugify(post: PublishHubPost): string {
  const base = (post.title || post.idea || post.id).toLowerCase();
  return base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || post.id;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadSingleAsset(post: PublishHubPost) {
  const url = post.currentDesignUrl;
  if (!url) {
    toast.error('Este post no tiene ninguna creatividad subida.');
    return;
  }
  const ext = isVideoUrl(url) ? 'mp4' : 'jpg';
  triggerDownload(url, `${slugify(post)}.${ext}`);
}

async function downloadCarouselZip(post: PublishHubPost) {
  const urls = post.carouselUrls || [];
  if (urls.length === 0) {
    toast.error('Este carrusel no tiene diapositivas subidas.');
    return;
  }
  try {
    const zip = new JSZip();
    await Promise.all(urls.map(async (url, idx) => {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      zip.file(`slide-${idx + 1}.${ext}`, blob);
    }));
    const content = await zip.generateAsync({ type: 'blob' });
    const blobUrl = URL.createObjectURL(content);
    triggerDownload(blobUrl, `${slugify(post)}-carrusel.zip`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error(err);
    toast.error('No se pudo generar el ZIP del carrusel.');
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function guessImageFormat(url: string): 'PNG' | 'JPEG' {
  return /^data:image\/png/i.test(url) || /\.png($|\?)/i.test(url) ? 'PNG' : 'JPEG';
}

async function downloadCarouselPdf(post: PublishHubPost) {
  const urls = post.carouselUrls || [];
  if (urls.length === 0) {
    toast.error('Este carrusel no tiene diapositivas subidas.');
    return;
  }
  try {
    const images = await Promise.all(urls.map(loadImage));
    const doc = new jsPDF({
      unit: 'px',
      format: [images[0].naturalWidth, images[0].naturalHeight],
      orientation: images[0].naturalWidth >= images[0].naturalHeight ? 'landscape' : 'portrait',
    });
    images.forEach((img, idx) => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (idx > 0) {
        doc.addPage([w, h], w >= h ? 'landscape' : 'portrait');
      }
      doc.addImage(img, guessImageFormat(urls[idx]), 0, 0, w, h);
    });
    doc.save(`${slugify(post)}-carrusel.pdf`);
  } catch (err) {
    console.error(err);
    toast.error('No se pudo generar el PDF del carrusel.');
  }
}

function copyCaption(text: string | undefined, label: string) {
  if (!text || !text.trim()) {
    toast.error(`No hay ${label} para copiar.`);
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => toast.success(`${label} copiado al portapapeles ✓`))
    .catch(() => toast.error('No se pudo copiar al portapapeles.'));
}

export default function PublishHubView({ posts, onSelectPost, loading = false }: PublishHubViewProps) {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'instagram' | 'linkedin' | 'tiktok'>('all');

  const visiblePosts = posts.filter(p => platformFilter === 'all' || p.platform === platformFilter);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-gray-200/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={20} />
            Listo para Publicar
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Descarga la creatividad y copia el caption de cada post aprobado, listo para subir a la red social.</p>
        </div>
        <select
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value as any)}
          aria-label="Filtrar por plataforma"
          className="bg-white border border-gray-200 rounded-md py-2 px-3 text-xs font-semibold text-gray-600 outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 cursor-pointer"
        >
          <option value="all">Todas las plataformas</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <CheckCircle2 className="mx-auto text-gray-200 mb-3" size={40} />
          <p className="text-sm font-medium text-gray-400">No hay posts aprobados pendientes de publicar todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePosts.map(post => {
            const isCarousel = post.format === 'carrusel';
            const isLinkedInCarousel = isCarousel && post.platform === 'linkedin';
            const thumbUrl = isCarousel
              ? post.carouselUrls?.[0]
              : (post.reelCoverUrl || post.currentDesignUrl);
            const thumbIsVideo = !isCarousel && !post.reelCoverUrl && isVideoUrl(thumbUrl);
            const hasTranslatedCaption = post.translationEnabled && !!post.copyCaptionTranslated?.trim();

            return (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={() => onSelectPost(post)}
                  className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative group"
                >
                  {thumbUrl ? (
                    thumbIsVideo ? (
                      <video src={thumbUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={thumbUrl} alt={post.title || post.idea} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )
                  ) : (
                    <ImageIcon className="text-gray-200" size={40} />
                  )}
                  {isCarousel && (post.carouselUrls?.length || 0) > 0 && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Layers size={11} /> {post.carouselUrls?.length}
                    </span>
                  )}
                </button>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${PLATFORM_META[post.platform].color}12`, color: PLATFORM_META[post.platform].color }}
                    >
                      <PlatformBadge platform={post.platform} size={16} showLabel />
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                      <CalendarDays size={13} className="text-gray-400" />
                      {post.date ? format(post.date instanceof Date ? post.date : (post.date?.toDate ? post.date.toDate() : new Date(post.date)), "d MMM yyyy") : ''}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">{post.title || post.idea}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (isLinkedInCarousel) downloadCarouselPdf(post);
                        else if (isCarousel) downloadCarouselZip(post);
                        else downloadSingleAsset(post);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-app-accent/5 hover:bg-app-accent/10 text-app-accent text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      {isLinkedInCarousel ? <FileText size={13} /> : <Download size={13} />}
                      {isLinkedInCarousel ? 'Descargar PDF' : isCarousel ? 'Descargar ZIP' : 'Descargar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCaption(post.copyCaption, 'Caption')}
                      className="w-full flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      <Copy size={13} /> Copiar caption
                    </button>
                    {hasTranslatedCaption && (
                      <button
                        type="button"
                        onClick={() => copyCaption(post.copyCaptionTranslated, 'Caption traducido')}
                        className="w-full flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg transition-colors"
                      >
                        <Languages size={13} /> Copiar traducido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
