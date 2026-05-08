import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  recargar = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-card p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Ocurrió un error inesperado</h1>
          <p className="text-sm text-slate-500 mb-4">
            La aplicación se interrumpió. Probá recargar; si el problema persiste, revisá la consola.
          </p>
          {this.state.error?.message && (
            <pre className="text-xs text-left bg-slate-50 rounded-lg p-3 mb-4 overflow-auto text-slate-700 border border-slate-200 max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={this.recargar}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
