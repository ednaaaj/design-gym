import type { ComponentType } from 'react';
import { ArticleCard, HotelCard, LoginForm, NavBar, PricingCard, ProfileCard, SettingsList, StatTiles, Toast } from './samples.tsx';

export { applyFlaws, exercises } from './exercises.ts';

export const componentRegistry: Record<string, ComponentType<{ params: Record<string, unknown> }>> = {
  ProfileCard,
  PricingCard,
  LoginForm,
  Toast,
  ArticleCard,
  StatTiles,
  SettingsList,
  NavBar,
  HotelCard,
};
