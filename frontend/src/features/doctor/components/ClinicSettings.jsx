import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
  marginTop: '0.5rem'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

export function ClinicSettings({ profile }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: profile?.clinic?.name || '',
    line1: profile?.clinic?.line1 || '',
    line2: profile?.clinic?.line2 || '',
    city: profile?.clinic?.city || '',
    state: profile?.clinic?.state || '',
    pincode: profile?.clinic?.pincode || '',
  });

  const [mapCenter, setMapCenter] = useState(
    profile?.clinic?.location?.coordinates
      ? { lat: profile.clinic.location.coordinates[1], lng: profile.clinic.location.coordinates[0] }
      : defaultCenter
  );
  
  const [markerPos, setMarkerPos] = useState(
    profile?.clinic?.location?.coordinates
      ? { lat: profile.clinic.location.coordinates[1], lng: profile.clinic.location.coordinates[0] }
      : null
  );

  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const updateClinicMutation = useMutation({
    mutationFn: doctorApi.updateClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      toast.success('Clinic settings updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update clinic settings');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onMapClick = useCallback((e) => {
    setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  const onMarkerDragEnd = useCallback((e) => {
    setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setMarkerPos({ lat, lng });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (markerPos) {
      payload.lat = markerPos.lat;
      payload.lng = markerPos.lng;
    }
    updateClinicMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Clinic Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="line1">Address Line 1</Label>
          <Input id="line1" name="line1" value={formData.line1} onChange={handleInputChange} required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="line2">Address Line 2 (Optional)</Label>
          <Input id="line2" name="line2" value={formData.line2} onChange={handleInputChange} />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" value={formData.state} onChange={handleInputChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} required />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location on Map</Label>
        {isLoaded ? (
          <div>
            <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)} onPlaceChanged={onPlaceChanged}>
              <Input placeholder="Search for your clinic location..." className="mb-2" />
            </Autocomplete>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={14}
              onClick={onMapClick}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              {markerPos && (
                <Marker
                  position={markerPos}
                  draggable={true}
                  onDragEnd={onMarkerDragEnd}
                />
              )}
            </GoogleMap>
          </div>
        ) : (
          <div className="h-[300px] bg-muted flex items-center justify-center rounded-lg text-muted-foreground text-sm">
            Loading Map...
          </div>
        )}
      </div>

      <Button type="submit" disabled={updateClinicMutation.isPending}>
        {updateClinicMutation.isPending ? 'Saving...' : 'Save Clinic Settings'}
      </Button>
    </form>
  );
}
