import { Link } from 'react-router-dom';
import { MapPin, Star, BadgeCheck, Clock, Home, Stethoscope } from 'lucide-react';

const DoctorCard = ({ doctor }) => {
  const formatFee = (paise) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(paise / 100);
  };

  // Find minimum fee across enabled types
  let minFee = null;
  if (doctor.types?.normal?.enabled && doctor.fees?.normal > 0) {
    minFee = minFee === null ? doctor.fees.normal : Math.min(minFee, doctor.fees.normal);
  }
  if (doctor.types?.premium?.enabled && doctor.fees?.premium > 0) {
    minFee = minFee === null ? doctor.fees.premium : Math.min(minFee, doctor.fees.premium);
  }
  if (doctor.types?.homeVisit?.enabled && doctor.fees?.homeVisit > 0) {
    minFee = minFee === null ? doctor.fees.homeVisit : Math.min(minFee, doctor.fees.homeVisit);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-5 flex-grow">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
            {doctor.gallery && doctor.gallery.length > 0 ? (
              <img
                src={doctor.gallery[0].url}
                alt={doctor.fullName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Stethoscope size={32} />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-1.5 line-clamp-1">
              Dr. {doctor.fullName}
              {doctor.isVerifiedBadge && (
                <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-1 mb-1">
              {doctor.headline || doctor.specializations?.map(s => s.name).join(', ')}
            </p>
            <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {doctor.stats?.rating > 0 ? doctor.stats.rating.toFixed(1) : 'New'}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{doctor.experienceYears} Yrs Exp</span>
            </div>
            <div className="flex items-start gap-1 text-sm text-slate-500 line-clamp-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {doctor.clinic?.city ? `${doctor.clinic.city}, ` : ''}{doctor.clinic?.state || 'Location available'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          {doctor.types?.normal?.enabled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5" /> Walk-in
            </span>
          )}
          {doctor.types?.premium?.enabled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              <Star className="w-3.5 h-3.5" /> Premium
            </span>
          )}
          {doctor.types?.homeVisit?.enabled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">
              <Home className="w-3.5 h-3.5" /> Home Visit
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-50 p-4 flex items-center justify-between border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Consultation Fee</p>
          <p className="font-semibold text-slate-900">
            {minFee ? formatFee(minFee) : 'Varies'} {minFee && <span className="text-xs font-normal text-slate-500">onwards</span>}
          </p>
        </div>
        <Link
          to={`/doctors/${doctor.slug}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View & Book
        </Link>
      </div>
    </div>
  );
};

export default DoctorCard;
