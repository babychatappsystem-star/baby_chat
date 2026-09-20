import React, { useEffect, useState } from 'react';
import { Tabs, Spin, Typography, Empty, theme } from 'antd';
import { stickerService } from '../../services/stickerService';
import type { StickerPackDTO } from '../../types/api.types';

interface StickerPickerProps {
  onSelect: (stickerId: string) => void;
}

const { Text } = Typography;

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect }) => {
  const [packs, setPacks] = useState<StickerPackDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = theme.useToken();

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const data = await stickerService.getStickerPacks();
        setPacks(data);
      } catch (error) {
        console.error('Failed to load sticker packs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPacks();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="default" />
      </div>
    );
  }

  if (packs.length === 0) {
    return <Empty description="No stickers available" />;
  }

  return (
    <div style={{ width: 320, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
      <Tabs
        defaultActiveKey={packs[0]?.id}
        tabPosition="bottom"
        size="small"
        style={{ flex: 1 }}
        items={packs.map((pack) => ({
          key: pack.id,
          label: pack.thumbnailUrl ? (
            <img src={pack.thumbnailUrl} alt={pack.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
          ) : (
            <Text>{pack.name}</Text>
          ),
          children: (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                maxHeight: 280,
                overflowY: 'auto',
                padding: '0 8px 8px 8px',
              }}
            >
              {pack.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = token.colorFillAlter)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <img
                    src={item.url}
                    alt="sticker"
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
};
