import { useState, useCallback, useRef } from 'react';
import { streamFundamentals } from '../services/fundamentalApi';

const EMPTY_SECTIONS   = { ratios: 'idle', cashflow: 'idle', balance_sheet: 'idle', pnl: 'idle' };
const EMPTY_DATA       = { ratios: null,   cashflow: null,   balance_sheet: null,   pnl: null   };
const EMPTY_COMMENTARY = { ratios: '',     cashflow: '',     balance_sheet: '',     pnl: ''     };

/**
 * Streaming-aware hook for fundamental analysis.
 *
 * State shape:
 *  loading          – true while any request is in-flight
 *  sections         – per-section fetch status: 'idle' | 'pending' | 'complete'
 *  sectionData      – per-section curated metric data (from section_complete events)
 *  sectionCommentary– per-section LLM analysis text (streams token-by-token)
 *  phase            – 'idle' | 'fetching' | 'analyzing' | 'done'
 *  result           – final result object (for cache restoration)
 *  error            – error message string or null
 *
 * Event protocol (full analysis):
 *   start → section_start × 4 → section_complete × 4 (with data)
 *   → section_analysis_start → token{section} → section_analysis_done  × 4
 *   → done
 */
export const useFundamental = () => {
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [result, setResult]                 = useState(null);
  const [sections, setSections]             = useState(EMPTY_SECTIONS);
  const [sectionData, setSectionData]       = useState(EMPTY_DATA);
  const [sectionCommentary, setSectionCommentary] = useState(EMPTY_COMMENTARY);
  const [activeAnalysisSection, setActiveAnalysisSection] = useState(null);
  const [phase, setPhase]                   = useState('idle');

  // Accumulate streaming text in refs so values are readable synchronously on 'done'
  const commentaryAccRef  = useRef({ ...EMPTY_COMMENTARY });
  const sectionDataAccRef = useRef({ ...EMPTY_DATA });

  // Legacy ref for component deep-dives (single streaming report)
  const reportAccRef = useRef('');
  const [streamingReport, setStreamingReport] = useState('');

  const cache    = useRef({});
  const abortRef = useRef(null);

  const analyze = useCallback((symbol, analysisType = 'all', query = '') => {
    const cacheKey = `${symbol}:${analysisType}`;

    // Restore cached result immediately
    if (cache.current[cacheKey]) {
      const cached = cache.current[cacheKey];
      setResult(cached);
      setSectionData(cached.sectionData    || EMPTY_DATA);
      setSectionCommentary(cached.commentary || EMPTY_COMMENTARY);
      setSections({ ratios: 'complete', cashflow: 'complete', balance_sheet: 'complete', pnl: 'complete' });
      setStreamingReport('');
      setPhase('done');
      setError(null);
      return;
    }

    abortRef.current?.abort();

    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingReport('');
    setPhase('fetching');
    setSections({ ...EMPTY_SECTIONS });
    setSectionData({ ...EMPTY_DATA });
    setSectionCommentary({ ...EMPTY_COMMENTARY });
    setActiveAnalysisSection(null);

    commentaryAccRef.current  = { ...EMPTY_COMMENTARY };
    sectionDataAccRef.current = { ...EMPTY_DATA };
    reportAccRef.current      = '';

    abortRef.current = streamFundamentals(symbol, analysisType, query, (event) => {
      switch (event.type) {

        case 'start':
          setPhase('fetching');
          break;

        case 'section_start':
          setSections((prev) => ({ ...prev, [event.section]: 'pending' }));
          break;

        case 'section_complete':
          setSections((prev) => ({ ...prev, [event.section]: 'complete' }));
          if (event.data) {
            sectionDataAccRef.current[event.section] = event.data;
            setSectionData((prev) => ({ ...prev, [event.section]: event.data }));
          }
          break;

        // Component deep-dive phases
        case 'fetching':
          setPhase('fetching');
          break;

        case 'analyzing':
        case 'consolidating':
          setPhase('analyzing');
          break;

        case 'section_analysis_start':
          setPhase('analyzing');
          setActiveAnalysisSection(event.section);
          break;

        case 'section_analysis_done':
          setActiveAnalysisSection(null);
          break;

        case 'token':
          if (event.section) {
            // Full analysis: route token to its section's commentary
            commentaryAccRef.current[event.section] =
              (commentaryAccRef.current[event.section] || '') + event.content;
            setSectionCommentary((prev) => ({
              ...prev,
              [event.section]: commentaryAccRef.current[event.section],
            }));
          } else {
            // Component deep-dive: accumulate into global report
            reportAccRef.current += event.content;
            setStreamingReport(reportAccRef.current);
          }
          break;

        case 'done': {
          const isFullAnalysis = !analysisType || analysisType === 'all';
          const finalObj = isFullAnalysis
            ? {
                symbol,
                analysisType,
                sectionData:  { ...sectionDataAccRef.current },
                commentary:   { ...commentaryAccRef.current },
                errors:       event.errors ?? [],
                timestamp:    event.timestamp ?? new Date().toISOString(),
              }
            : {
                symbol,
                analysisType,
                consolidated_report: reportAccRef.current,
                errors:              event.errors ?? [],
                timestamp:           event.timestamp ?? new Date().toISOString(),
              };

          cache.current[cacheKey] = finalObj;
          setResult(finalObj);
          setPhase('done');
          setLoading(false);
          break;
        }

        case 'error':
          setError(event.message);
          setPhase('idle');
          setLoading(false);
          break;

        default:
          break;
      }
    });
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    commentaryAccRef.current  = { ...EMPTY_COMMENTARY };
    sectionDataAccRef.current = { ...EMPTY_DATA };
    reportAccRef.current      = '';
    setResult(null);
    setStreamingReport('');
    setError(null);
    setPhase('idle');
    setSections({ ...EMPTY_SECTIONS });
    setSectionData({ ...EMPTY_DATA });
    setSectionCommentary({ ...EMPTY_COMMENTARY });
    setActiveAnalysisSection(null);
    cache.current = {};
  }, []);

  const isCached = useCallback((symbol, analysisType) => {
    return Boolean(cache.current[`${symbol}:${analysisType}`]);
  }, []);

  return {
    loading,
    error,
    result,
    streamingReport,
    sections,
    sectionData,
    sectionCommentary,
    activeAnalysisSection,
    phase,
    analyze,
    clear,
    isCached,
  };
};
