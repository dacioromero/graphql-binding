import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  parse,
  FragmentDefinitionNode,
  ExecutableDefinitionNode,
} from 'graphql'
import { getDeepType } from '../info'
import immutable from 'object-path-immutable'

export function addFragmentToInfo(
  info: GraphQLResolveInfo,
  fragment: string,
): GraphQLResolveInfo {
  const returnType = getDeepType(info.returnType)
  if (returnType instanceof GraphQLScalarType) {
    throw new Error(
      `Can't add fragment "${fragment}" because return type of info object is a scalar type ${info.returnType.toString()}`,
    )
  }

  const [queryNode, ...rest] = parse(fragment).definitions

  const deepReturnType = getDeepType(returnType)

  if (
    queryNode.kind === 'FragmentDefinition' &&
    queryNode.typeCondition.name.value !== deepReturnType.toString()
  ) {
    throw new Error(
      `Type ${
        queryNode.typeCondition.name.value
      } specified in fragment doesn't match return type ${deepReturnType.toString()}`,
    )
  }

  const fragments = Object.fromEntries(
    rest
      .filter(
        (def): def is FragmentDefinitionNode =>
          def.kind === 'FragmentDefinition',
      )
      .map(d => [d.name.value, d]),
  )

  return immutable(info)
    .update('fieldNodes.0.selectionSet.selections', selections =>
      selections.concat(
        (queryNode as ExecutableDefinitionNode).selectionSet.selections,
      ),
    )
    .assign('fragments', fragments as any)
    .value()
}
