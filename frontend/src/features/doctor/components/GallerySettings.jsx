import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';

export function GallerySettings({ profile, isExpired }) {
  const queryClient = useQueryClient();
  const { fetchUser } = useAuth();
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Use user's avatar as profile picture
  const profilePicUrl = profile?.user?.avatarUrl;
  const gallery = profile?.gallery || [];

  const uploadPicMutation = useMutation({
    mutationFn: doctorApi.uploadPicture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      fetchUser();
      toast.success('Profile picture updated');
      setIsUploadingPic(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload picture');
      setIsUploadingPic(false);
    }
  });

  const uploadGalleryMutation = useMutation({
    mutationFn: (data) => doctorApi.addGalleryImage(data.file, data.caption, data.order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      toast.success('Gallery image added');
      setIsUploadingGallery(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload gallery image');
      setIsUploadingGallery(false);
    }
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: doctorApi.deleteGalleryImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      toast.success('Image deleted');
    }
  });

  const handlePicUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPic(true);
      uploadPicMutation.mutate(file);
    }
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (gallery.length >= 12) {
        toast.error('Maximum 12 photos allowed');
        return;
      }
      setIsUploadingGallery(true);
      uploadGalleryMutation.mutate({ file, caption: '', order: gallery.length + 1 });
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Picture Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Profile Picture</h3>
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pic-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingPic ? 'Uploading...' : 'Upload New Picture'}
            </Label>
            <Input 
              id="pic-upload" 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              onChange={handlePicUpload} 
              disabled={isUploadingPic || isExpired}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Clinic Gallery ({gallery.length}/12)</h3>
          <div>
            <Label htmlFor="gallery-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingGallery ? 'Uploading...' : 'Add Photo'}
            </Label>
            <Input 
              id="gallery-upload" 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              onChange={handleGalleryUpload} 
              disabled={isUploadingGallery || gallery.length >= 12 || isExpired}
            />
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No photos in your gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((img) => (
              <div key={img._id} className="group relative aspect-square rounded-md overflow-hidden bg-muted border">
                <img src={img.url} alt={img.caption || 'Clinic photo'} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => deleteGalleryMutation.mutate(img._id)}
                    disabled={deleteGalleryMutation.isPending || isExpired}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserPlaceholder() {
  return (
    <svg className="h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
