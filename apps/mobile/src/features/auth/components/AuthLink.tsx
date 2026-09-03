import { Link, LinkProps } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../../shared/theme';

type AuthLinkProps = {
  href: LinkProps['href'];
  label: string;
};

export function AuthLink({ href, label }: AuthLinkProps) {
  return (
    <Link href={href} asChild>
      <Text style={styles.link}>{label}</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
