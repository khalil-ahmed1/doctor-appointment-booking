import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getDoctorBySlug } from '../api/public.api';
import { MapPin, Star, Clock, GraduationCap, Languages, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem'
};

const DoctorDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: doctor, isLoading, isError } = useQuery({
    queryKey: ['doctor', slug],
    queryFn: () => getDoctorBySlug(slug),
    retry: false
  });

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="w-full flex flex-col pt-32 pb-20 items-center px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Doctor Not Found</h1>
        <p className="text-muted-foreground mb-6 max-w-md">The doctor profile you are looking for does not exist or is no longer available.</p>
        <Button asChild>
          <Link to="/doctors">Browse All Doctors</Link>
        </Button>
      </div>
    );
  }

  const handleBookNow = () => {
    if (!user) {
      navigate(`/login?redirect=/doctors/${slug}`);
    } else {
      alert('Booking flow will be implemented in F-23.');
    }
  };

  const center = doctor.clinic?.location?.coordinates
    ? { lat: doctor.clinic.location.coordinates[1], lng: doctor.clinic.location.coordinates[0] }
    : null;

  const profileImageUrl = doctor.gallery?.find((g) => g.caption === 'Profile Picture')?.url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.fullName)}&background=e0e7ff&color=4f46e5&size=256`;

  return (
    <>
      <Helmet>
        <title>Dr. {doctor.fullName} - {doctor.specializations?.map(s => s.name).join(', ')}</title>
        <meta name="description" content={`Book an appointment with Dr. ${doctor.fullName}. ${doctor.headline || doctor.bio?.substring(0, 100) || 'Expert doctor available for consultation.'}`} />
        <meta property="og:title" content={`Dr. ${doctor.fullName}`} />
        <meta property="og:image" content={profileImageUrl} />
      </Helmet>

      <div className="w-full pt-8 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Header Profile Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
              <img
                src={profileImageUrl}
                alt={`Dr. ${doctor.fullName}`}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-slate-50 shadow-sm"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Dr. {doctor.fullName}</h1>
                    <p className="text-lg text-blue-600 font-medium mb-4">
                      {doctor.specializations?.map(s => s.name).join(', ')}
                    </p>
                  </div>
                  <Button size="lg" onClick={handleBookNow} className="whitespace-nowrap font-bold px-8">
                    Book Appointment
                  </Button>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3 text-muted-foreground mt-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-slate-800">{doctor.stats?.rating > 0 ? doctor.stats.rating.toFixed(1) : 'New'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 opacity-70" />
                    <span>{doctor.experienceYears} Years Exp.</span>
                  </div>
                  {doctor.clinic?.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 opacity-70" />
                      <span>{doctor.clinic.city}</span>
                    </div>
                  )}
                  {doctor.languages?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Languages className="w-5 h-5 opacity-70" />
                      <span>{doctor.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">About the Doctor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {doctor.bio || 'No biography provided yet.'}
                  </p>
                </CardContent>
              </Card>

              {/* Qualifications */}
              {doctor.qualifications?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" /> Qualifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 text-muted-foreground">
                      {doctor.qualifications.map((qual, idx) => (
                        <li key={idx} className="flex flex-col">
                          <span className="font-semibold text-foreground">{qual.degree}</span>
                          <span>{qual.institute} {qual.year ? `(${qual.year})` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Gallery */}
              {doctor.gallery?.filter(g => g.caption !== 'Profile Picture').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Clinic Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doctor.gallery.filter(g => g.caption !== 'Profile Picture').map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-md overflow-hidden border border-border">
                          <img src={img.url} alt={img.caption || 'Clinic photo'} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Right Content - Sidebar */}
            <div className="space-y-8">

              {/* Services & Fees */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" /> Consultation Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctor.types?.normal?.enabled && (
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-foreground">Clinic Visit (Token)</p>
                          <p className="text-xs text-muted-foreground">{doctor.types.normal.walkInHoursText || 'Walk-in'}</p>
                        </div>
                        <span className="font-bold text-blue-700">₹{(doctor.fees?.normal || 0) / 100}</span>
                      </div>
                    )}
                    {doctor.types?.premium?.enabled && (
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-foreground">Premium Slot</p>
                          <p className="text-xs text-muted-foreground">Reserved timing</p>
                        </div>
                        <span className="font-bold text-blue-700">₹{(doctor.fees?.premium || 0) / 100}</span>
                      </div>
                    )}
                    {doctor.types?.homeVisit?.enabled && (
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-foreground">Home Visit</p>
                          <p className="text-xs text-muted-foreground">Doctor visits you</p>
                        </div>
                        <span className="font-bold text-blue-700">₹{(doctor.fees?.homeVisit || 0) / 100}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Clinic Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Clinic Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {doctor.clinic?.name && (
                    <p className="font-semibold text-foreground mb-1">{doctor.clinic.name}</p>
                  )}
                  <p className="text-muted-foreground text-sm mb-4">
                    {doctor.clinic?.line1}{doctor.clinic?.line2 ? `, ${doctor.clinic.line2}` : ''}<br />
                    {doctor.clinic?.city}, {doctor.clinic?.state} {doctor.clinic?.pincode}
                  </p>

                  {center && isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={center}
                      zoom={15}
                      options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                      <Marker position={center} />
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-[300px] bg-slate-100 rounded-md flex items-center justify-center text-muted-foreground">
                      Map not available
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorDetailPage;
