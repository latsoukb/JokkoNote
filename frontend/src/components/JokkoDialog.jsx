import React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { JOKKO } from '../lib/jokkoTheme';
import { cn } from '../lib/utils';

/** Modale JokkoNote — bandeau orange, icône, pied fixe. */
const JokkoDialog = ({
  icon: Icon,
  title,
  description,
  children,
  footer,
  className,
}) => (
  <DialogContent className={cn(JOKKO.dialog, className)}>
    <div className={JOKKO.dialogAccent} aria-hidden />
    <div className="p-6 sm:p-7 space-y-5">
      <DialogHeader className="space-y-0 text-left">
        <div className="flex gap-4 items-start">
          {Icon && (
            <div className={JOKKO.dialogIcon}>
              <Icon className="w-6 h-6" strokeWidth={1.75} />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
            <DialogTitle className="text-xl font-semibold tracking-tight leading-snug">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className={`text-sm leading-relaxed ${JOKKO.muted}`}>
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4">{children}</div>
      {footer && <DialogFooter className={JOKKO.dialogFooter}>{footer}</DialogFooter>}
    </div>
  </DialogContent>
);

export default JokkoDialog;
