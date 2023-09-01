import { ImageLC, ContainerLC } from '@m-cafe-app/frontend-components/lcWeb';

interface UnderConstructionProps {
  svgUrl: string;
}

export const UnderConstructionLC = ({ svgUrl }: UnderConstructionProps) => {

  return (
    <ContainerLC className='page-under-construction'>
      <ContainerLC className='under-construction'>
        <ContainerLC className='container-title'>
          {/* <TextComp text={t('underConstruction.title')} className='text-title'/>
          <TextComp text={t('underConstruction.info')} className='text-info'/> */}
        </ContainerLC>
        <ContainerLC className='container-svg'>
          <ImageLC src={svgUrl} altText='Under construction' className='construction-svg'/>
        </ContainerLC>
      </ContainerLC>
    </ContainerLC>
  );
};