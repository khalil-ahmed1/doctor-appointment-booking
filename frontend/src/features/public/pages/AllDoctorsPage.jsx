import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Filter, X } from 'lucide-react';
import { searchDoctors, getSpecializations } from '../api/public.api';
import DoctorCard from '../components/DoctorCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const AllDoctorsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    specialization: searchParams.get('specialization') || '',
    type: searchParams.get('type') || '',
    sort: searchParams.get('sort') || 'RELEVANCE',
    page: parseInt(searchParams.get('page')) || 1,
  });

  // Local state for debounced inputs
  const [searchInput, setSearchInput] = useState(filters.q);
  const [cityInput, setCityInput] = useState(filters.city);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchInput, page: 1 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Debounce city input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => ({ ...prev, city: cityInput, page: 1 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [cityInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.city) params.set('city', filters.city);
    if (filters.specialization) params.set('specialization', filters.specialization);
    if (filters.type) params.set('type', filters.type);
    if (filters.sort && filters.sort !== 'RELEVANCE') params.set('sort', filters.sort);
    if (filters.page > 1) params.set('page', filters.page.toString());
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const { data: specializations } = useQuery({
    queryKey: ['specializations'],
    queryFn: getSpecializations,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctors', filters],
    queryFn: () => {
      const apiFilters = { ...filters };
      if (apiFilters.specialization) {
        apiFilters.specializations = [apiFilters.specialization];
        delete apiFilters.specialization;
      }
      return searchDoctors(apiFilters);
    },
    keepPreviousData: true,
  });

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setCityInput('');
    setFilters({ q: '', city: '', specialization: '', type: '', sort: 'RELEVANCE', page: 1 });
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="w-full flex flex-col">
      {/* Hero Search Section */}
      <div className="bg-blue-600 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Find and Book the Best Doctors
          </h1>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Book appointments for clinic visits or home consultations with top specialists near you.
          </p>

          <div className="bg-white p-2 rounded-xl shadow-xl max-w-4xl mx-auto flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search doctors, specialties, symptoms..."
                className="w-full pl-11 pr-4 py-3 text-slate-900 rounded-lg bg-slate-50 border-none focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              />
            </div>
            <div className="relative flex-1 md:max-w-xs">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="City or location"
                className="w-full pl-11 pr-4 py-3 text-slate-900 rounded-lg bg-slate-50 border-none focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters (Desktop) */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white p-5 rounded-xl border border-slate-200 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" /> Filters
              </h2>
              <Button variant="link" size="sm" onClick={clearFilters} className="px-0">
                Clear
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">Specialization</Label>
                <div className="relative">
                  <select
                    name="specialization"
                    value={filters.specialization}
                    onChange={handleFilterChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                  >
                    <option value="">All Specialties</option>
                    {specializations?.map(spec => (
                      <option key={spec._id} value={spec._id}>{spec.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Consultation Type</Label>
                <div className="space-y-3 mt-2">
                  {['', 'PREMIUM', 'HOME', 'NORMAL'].map((typeOption) => (
                    <label key={typeOption} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="type"
                        value={typeOption}
                        checked={filters.type === typeOption}
                        onChange={handleFilterChange}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600 focus:ring-offset-0 bg-white"
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">
                        {typeOption === '' ? 'Any Type' : typeOption === 'HOME' ? 'Home Visit' : typeOption === 'PREMIUM' ? 'Premium (Slot)' : 'Walk-in (Token)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <p className="text-slate-600 font-medium">
            {data?.total || 0} Doctors found
          </p>
          <Button 
            variant="outline"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        {/* Results Area */}
        <main className="flex-1">
          <div className="flex justify-between items-center mb-6 hidden md:flex">
            <p className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{data?.total || 0}</span> doctors
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                name="sort"
                value={filters.sort}
                onChange={handleFilterChange}
                className="bg-transparent text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="EXPERIENCE">Experience</option>
                <option value="FEE_ASC">Fee: Low to High</option>
                <option value="FEE_DESC">Fee: High to Low</option>
                <option value="NEWEST">Newest Additions</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-xl h-64 border border-slate-100 animate-pulse"></div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-center">
              Failed to load doctors. Please try again.
            </div>
          ) : data?.doctors?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No doctors found</h3>
              <p className="text-slate-500">Try adjusting your search or filters to find what you're looking for.</p>
              <Button 
                variant="outline"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.doctors.map((doctor) => (
                  <DoctorCard key={doctor._id} doctor={doctor} />
                ))}
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="mt-10 flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    disabled={filters.page === 1}
                    onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {filters.page} of {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={filters.page === data.totalPages}
                    onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white ml-auto h-full shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="font-semibold text-lg">Filters</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
               <div>
                <Label className="block mb-2">Sort By</Label>
                <div className="relative">
                  <select
                    name="sort"
                    value={filters.sort}
                    onChange={handleFilterChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                  >
                    <option value="RELEVANCE">Relevance</option>
                    <option value="EXPERIENCE">Experience</option>
                    <option value="FEE_ASC">Fee: Low to High</option>
                    <option value="FEE_DESC">Fee: High to Low</option>
                    <option value="NEWEST">Newest Additions</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label className="block mb-2">Specialization</Label>
                <div className="relative">
                  <select
                    name="specialization"
                    value={filters.specialization}
                    onChange={handleFilterChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                  >
                    <option value="">All Specialties</option>
                    {specializations?.map(spec => (
                      <option key={spec._id} value={spec._id}>{spec.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label className="block mb-2">Consultation Type</Label>
                <div className="space-y-3">
                  {['', 'PREMIUM', 'HOME', 'NORMAL'].map((typeOption) => (
                    <label key={typeOption} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="type"
                        value={typeOption}
                        checked={filters.type === typeOption}
                        onChange={handleFilterChange}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-slate-700">
                        {typeOption === '' ? 'Any Type' : typeOption === 'HOME' ? 'Home Visit' : typeOption === 'PREMIUM' ? 'Premium (Slot)' : 'Walk-in (Token)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <Button 
                variant="outline"
                onClick={clearFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllDoctorsPage;
